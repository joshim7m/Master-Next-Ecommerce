import prisma from './prisma';

/**
 * Merchandising engine for cross-sell / upsell recommendations.
 *
 * Consumed by:
 *   - app/(storefront)/products/[slug]/page.jsx  (server component, "related products")
 *   - app/api/recommendations/route.js           (public GET, cart/checkout bundles)
 *
 * Precedence is curated-first: an admin-picked `ProductUpsell` row always wins,
 * and automatic scoring only fills the remaining slots. See docs/plan-upsell-bundles.md.
 *
 * Server-only — imports the Prisma client.
 */

/** The product include every merchandising surface needs. */
export const RECOMMEND_INCLUDE = { images: true, variants: true };

/** How many same-category candidates to score before taking the best. */
const CANDIDATE_POOL = 40;

/** A candidate's price must be within ±30% of a seed price to earn the price-band score. */
const PRICE_BAND = 0.3;

/**
 * Scoring weights for automatic recommendations.
 * Category overlap is the strongest relevance signal available; tags are the
 * merchandiser's own keyword layer; the price band stops a ৳200 item being
 * suggested next to a ৳20,000 one; `featured` is the existing manual promote
 * flag and only ever breaks a tie.
 */
const SCORE = {
  category: 3,
  tag: 2,
  priceBand: 1,
  featured: 0.5,
};

/** Prisma Decimals become plain strings across the RSC/API boundary. */
function serialize(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function unique(list) {
  return [...new Set((list || []).filter(Boolean))];
}

/** The price a customer actually pays. */
export function effectivePrice(product) {
  return Number(product?.sale_price ?? product?.unite_price ?? 0) || 0;
}

/**
 * Stock check used to keep sold-out products out of recommendation slots.
 * A product with variants is in stock if any variant has stock; a nullable
 * base `quantity` is treated as unknown → in stock, matching the product page.
 */
export function isInStock(product) {
  const variants = product?.variants || [];
  if (variants.length) return variants.some((v) => (v.quantity ?? 0) > 0);
  return (product?.quantity ?? 1) > 0;
}

function parseTags(tags) {
  return String(tags || '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function scoreProduct(product, seedCategoryIds, seedTags, seedPrices) {
  let score = 0;

  const sharedCategories = (product.categories || []).filter((c) => seedCategoryIds.has(c.id)).length;
  score += sharedCategories * SCORE.category;

  const productTags = parseTags(product.tags);
  const sharedTags = productTags.filter((t) => seedTags.has(t)).length;
  score += sharedTags * SCORE.tag;

  const price = effectivePrice(product);
  const nearSeedPrice = seedPrices.some((seedPrice) => {
    if (seedPrice <= 0 || price <= 0) return false;
    return Math.abs(price - seedPrice) / seedPrice <= PRICE_BAND;
  });
  if (nearSeedPrice) score += SCORE.priceBand;

  if (product.featured) score += SCORE.featured;

  return score;
}

/** Newest first, so equal scores resolve deterministically. */
function byNewest(a, b) {
  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
}

/**
 * Fill remaining slots with featured products, then newest, so a rail never
 * renders short while stock exists.
 */
async function backfill(missing, picked, excluded) {
  if (missing <= 0) return [];

  const seen = new Set([...excluded, ...picked.map((p) => p.id)]);
  const filler = await prisma.product.findMany({
    where: { status: 'publish', id: { notIn: [...seen] } },
    include: RECOMMEND_INCLUDE,
    // Over-fetch so out-of-stock rows can be skipped without coming up short.
    take: missing * 3,
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
  });

  return filler.filter(isInStock).slice(0, missing);
}

/**
 * Automatic recommendations: same category, then scored by shared tags, price
 * proximity and featured status.
 *
 * @param {object}  opts
 * @param {string[]} opts.seedIds    Products to base recommendations on.
 * @param {string[]} [opts.excludeIds] Never recommend these (e.g. the cart's contents).
 * @param {number}   [opts.limit]
 * @returns {Promise<object[]>} serializable products
 */
export async function getAutoRelated({ seedIds, excludeIds = [], limit = 6 } = {}) {
  const target = Math.max(0, Number(limit) || 0);
  const seeds = unique(seedIds);
  if (!seeds.length || target === 0) return [];

  const seedRows = await prisma.product.findMany({
    where: { id: { in: seeds } },
    select: {
      id: true,
      tags: true,
      unite_price: true,
      sale_price: true,
      categories: { select: { id: true } },
    },
  });
  if (!seedRows.length) return [];

  const excluded = unique([...seeds, ...excludeIds]);
  const seedCategoryIds = new Set(seedRows.flatMap((s) => s.categories.map((c) => c.id)));
  const seedTags = new Set(seedRows.flatMap((s) => parseTags(s.tags)));
  const seedPrices = seedRows.map(effectivePrice).filter((p) => p > 0);

  // With no category on the seed products there is no pool to score — the
  // backfill below handles it.
  let pool = [];
  if (seedCategoryIds.size) {
    pool = await prisma.product.findMany({
      where: {
        status: 'publish',
        id: { notIn: excluded },
        categories: { some: { id: { in: [...seedCategoryIds] } } },
      },
      include: RECOMMEND_INCLUDE,
      take: CANDIDATE_POOL,
      orderBy: { createdAt: 'desc' },
    });
  }

  const scored = pool
    .filter(isInStock)
    .map((product) => ({ product, score: scoreProduct(product, seedCategoryIds, seedTags, seedPrices) }))
    .sort((a, b) => b.score - a.score || byNewest(a.product, b.product))
    .slice(0, target)
    .map((entry) => entry.product);

  if (scored.length >= target) return serialize(scored);

  const filler = await backfill(target - scored.length, scored, excluded);
  return serialize([...scored, ...filler]);
}

/**
 * Recommendations for an upsell bundle: admin-curated links first, automatic
 * scoring for whatever is left.
 *
 * @param {object}  opts
 * @param {string[]} opts.seedIds    Products in the cart, or the product on the PDP.
 * @param {string[]} [opts.excludeIds] Additional ids to never recommend.
 * @param {number}   [opts.limit]
 * @returns {Promise<{ products: object[], source: 'curated'|'auto'|'mixed' }>}
 */
export async function getUpsellAddOns({ seedIds, excludeIds = [], limit = 3 } = {}) {
  const target = Math.max(0, Number(limit) || 0);
  const seeds = unique(seedIds);
  if (!seeds.length || target === 0) return { products: [], source: 'auto' };

  const excluded = new Set(unique([...seeds, ...excludeIds]));

  const links = await prisma.productUpsell.findMany({
    where: {
      productId: { in: seeds },
      upsell: { status: 'publish' },
    },
    include: { upsell: { include: RECOMMEND_INCLUDE } },
    // Grouped by seed product so one product's curated set stays together.
    orderBy: [{ productId: 'asc' }, { sortOrder: 'asc' }],
  });

  const curated = [];
  const seen = new Set();
  for (const link of links) {
    const product = link.upsell;
    if (!product || excluded.has(product.id) || seen.has(product.id)) continue;
    if (!isInStock(product)) continue;
    seen.add(product.id);
    curated.push(product);
    if (curated.length >= target) break;
  }

  if (curated.length >= target) {
    return { products: serialize(curated), source: 'curated' };
  }

  const auto = await getAutoRelated({
    seedIds: seeds,
    excludeIds: [...excluded, ...curated.map((p) => p.id)],
    limit: target - curated.length,
  });

  const source = curated.length === 0 ? 'auto' : auto.length === 0 ? 'curated' : 'mixed';
  return { products: serialize([...curated, ...auto]), source };
}
