const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const BASE = 'https://khanexpressbd.com';
const OUT = path.join(__dirname, 'catalogData.json');
const CONC = 5; // concurrent detail-page requests
const TIMEOUT = 20000;
const DELAY = 350; // polite pause between listing requests
const MAX_PAGES = 50;

async function fetchHTML(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parsePrice(text) {
  if (!text) return null;
  const n = parseFloat(String(text).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

/**
 * Normalise a listing/detail price pair into (list price, sale price).
 *
 * The site shows the price actually charged as `.price.current-price` and, only
 * when there is a discount, the struck-through original as `.price.old-price`.
 * A discount therefore exists only when old > current, and `unite_price` must be
 * the *original* so that `sale_price` is never the higher of the pair.
 */
function normalizePrices(current, old) {
  if (current == null && old == null) return { unitePrice: 0, salePrice: null };
  if (old != null && current != null && old > current) {
    return { unitePrice: old, salePrice: current };
  }
  return { unitePrice: current != null ? current : old, salePrice: null };
}

function productShowSlug(href) {
  const m = (href || '').match(/\/product-show\/(\d+)/);
  return m ? m[1] : (href || '').split('/').filter(Boolean).pop() || null;
}

/** Menu labels carry a trailing product count, e.g. "গ্যাজেট (5)". */
function parseCount(text) {
  const m = String(text || '').match(/\((\d+)\)\s*$/);
  return m ? parseInt(m[1], 10) : null;
}

function cleanLabel(text) {
  return String(text || '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ——— Scrape categories + subcategories ———
//
// Primary source is the "shop by category" menu, which lists every category in
// one place and — crucially — publishes each one's product count, so empty
// categories can be skipped without spending a request on them.
async function scrapeCategories() {
  console.log('Fetching products-list for categories…');
  const html = await fetchHTML(`${BASE}/products-list`);
  const $ = cheerio.load(html);
  const cats = new Map(); // category_id -> { name, slug, count, subs: Map }

  const addCat = (id, name, count) => {
    if (!cats.has(id)) {
      cats.set(id, { id, name: name || '', count, subs: new Map() });
    }
    const cat = cats.get(id);
    if (name) cat.name = name;
    // A count is only recorded from an authoritative source; never downgrade a
    // known count to null because a later link omitted one.
    if (count != null) cat.count = count;
    return cat;
  };

  const addSub = (catId, subId, name, count) => {
    const cat = addCat(catId, null, null);
    if (!cat.subs.has(subId)) cat.subs.set(subId, { id: subId, name: name || '', count });
    const sub = cat.subs.get(subId);
    if (name) sub.name = name;
    if (count != null) sub.count = count;
  };

  $('div.shop-submenu a[href*="category_id"]').each((_, a) => {
    const href = ($(a).attr('href') || '').replace(/&amp;/g, '&');
    const cid = href.match(/category_id=(\d+)/);
    if (!cid) return;
    const sid = href.match(/sub_category_id=(\d+)/);
    const label = cleanLabel($(a).text());
    const count = parseCount($(a).text());
    if (!label) return;
    if (sid) addSub(cid[1], sid[1], label, count);
    else addCat(cid[1], label, count);
  });

  // Fallback: the main navbar's dropdown, in case the shop menu markup changes.
  if (!cats.size) {
    console.log('  (shop menu empty — falling back to navbar dropdowns)');
    $('ul.h-final-navbar-nav > li.h-final-dropdown-parent').each((_, li) => {
      const $li = $(li);
      const topHref = ($li.find('> a').first().attr('href') || '').replace(/&amp;/g, '&');
      const cid = topHref.match(/category_id=(\d+)/);
      if (!cid) return;
      addCat(cid[1], cleanLabel($li.find('> a').first().text()), null);
      $li.find('ul.h-final-dropdown-menu > li > a').each((__, a) => {
        const href = ($(a).attr('href') || '').replace(/&amp;/g, '&');
        const sid = href.match(/sub_category_id=(\d+)/);
        const name = cleanLabel($(a).text());
        if (sid && name) addSub(cid[1], sid[1], name, null);
      });
    });
  }

  const list = [...cats.values()]
    .filter((c) => c.name)
    .map((c) => ({
      id: c.id,
      name: c.name,
      count: c.count,
      href: `${BASE}/products-list?category_id=${c.id}`,
      subs: [...c.subs.values()]
        .filter((s) => s.name)
        .map((s) => ({
          id: s.id,
          name: s.name,
          count: s.count,
          href: `${BASE}/products-list?category_id=${c.id}&sub_category_id=${s.id}`,
        })),
    }));

  const withCount = list.filter((c) => c.count != null).length;
  console.log(`  → ${list.length} categories found (${withCount} with a published product count)`);
  return list;
}

// ——— Parse product items from a products-list page ———
function parseListPage(html) {
  const $ = cheerio.load(html);
  const items = [];
  $('div.box[data-product-url]').each((_, el) => {
    const $e = $(el);
    const url = $e.attr('data-product-url');
    if (!url) return;
    const { unitePrice, salePrice } = normalizePrices(
      parsePrice($e.find('.price.current-price').first().text()),
      parsePrice($e.find('.price.old-price').first().text())
    );
    items.push({
      name: $e.find('h5.title a').text().trim(),
      slug: productShowSlug(url),
      url,
      image: $e.find('img.product_img.main_img').attr('src') || '',
      unitePrice,
      salePrice,
    });
  });
  return { items, hasPager: $('a[href*="page="]').length > 0 };
}

// ——— Scrape products from a category/subcategory URL ———
//
// Stops as soon as a page advertises no pagination controls, so a single-page
// category does not cost a wasted request for a phantom page 2.
async function scrapeCategoryProducts(url) {
  const products = [];
  let pages = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const pageUrl = page === 1 ? url : url.includes('?') ? `${url}&page=${page}` : `${url}?page=${page}`;
    let parsed;
    try {
      parsed = parseListPage(await fetchHTML(pageUrl));
    } catch (e) {
      console.error(`    ✗ Page ${page}: ${e.message}`);
      break;
    }
    pages++;
    if (!parsed.items.length) break;
    products.push(...parsed.items);
    if (!parsed.hasPager) break;
    await sleep(DELAY);
  }

  return { products, pages };
}

// ——— Scrape product detail page ———
async function scrapeProductDetail(url) {
  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    const outOfStock =
      $('div.single_out_stock.out-of-stock').length > 0 || $('input[name="is_stock"]').attr('value') === '-1';

    const title = $('h2.product-title').text().trim() || cleanLabel($('title').text());

    const $price = $('.product-price-variant');
    const { unitePrice, salePrice } = normalizePrices(
      parsePrice($price.find('.price-display').first().text()),
      parsePrice($price.find('del .price').first().text() || $price.find('del').first().text())
    );

    // The gallery repeats one anchor per thumbnail and often several identical
    // hrefs, so dedupe while preserving order.
    const images = [];
    const seen = new Set();
    $('a.popup-zoom').each((_, a) => {
      const src = $(a).attr('href');
      if (!src) return;
      const abs = src.startsWith('http') ? src : BASE + src;
      if (seen.has(abs)) return;
      seen.add(abs);
      images.push(abs);
    });
    if (!images.length) {
      const main = $('img.drift-demo-trigger.main-product-img').attr('src');
      if (main) images.push(main.startsWith('http') ? main : BASE + main);
    }

    return { title, unitePrice, salePrice, images, outOfStock };
  } catch (e) {
    console.error(`    ✗ ${e.message}`);
    return null;
  }
}

// ——— Main ———
async function main() {
  const startTime = Date.now();
  const host = BASE.replace(/^https?:\/\//, '');
  console.log(`=== Fetch Catalog from ${host} ===\n`);

  const cats = await scrapeCategories();

  console.log('\nScraping product listings…');
  const all = [];
  const seen = new Set();
  const skippedEmpty = [];

  const collect = (products, catId, subId) => {
    let added = 0;
    for (const p of products) {
      if (!p.slug) continue;
      if (seen.has(p.slug)) continue;
      seen.add(p.slug);
      all.push({ ...p, catId, subId: subId || null });
      added++;
    }
    return added;
  };

  for (const c of cats) {
    // Skip a whole empty branch before spending a single request on it.
    if (c.count === 0) {
      skippedEmpty.push(`${c.name} (category)`);
      for (const s of c.subs) {
        if (s.count === 0) skippedEmpty.push(`${c.name} › ${s.name}`);
      }
      continue;
    }

    const { products, pages } = await scrapeCategoryProducts(c.href);
    collect(products, c.id, null);
    console.log(`  ${c.name}: ${products.length} listed over ${pages} page(s)${c.count != null ? ` [menu says ${c.count}]` : ''}`);
    await sleep(DELAY);

    for (const s of c.subs) {
      if (s.count === 0) {
        skippedEmpty.push(`${c.name} › ${s.name}`);
        continue;
      }
      const sub = await scrapeCategoryProducts(s.href);
      if (collect(sub.products, c.id, s.id)) console.log(`    ${s.name}: ${sub.products.length} listed`);
      await sleep(DELAY);
    }
  }

  console.log(`\nTotal unique product URLs: ${all.length}`);
  if (skippedEmpty.length) {
    console.log(`Skipped ${skippedEmpty.length} empty branch(es) without fetching:`);
    for (const label of skippedEmpty) console.log(`  · ${label}`);
  }

  // Fetch details for each product
  console.log('\nFetching product details…');
  let done = 0;
  const detailed = [];
  const subNamesByCat = new Map(
    cats.map((c) => [c.id, c.subs.map((s) => s.name)])
  );

  for (let i = 0; i < all.length; i += CONC) {
    const batch = all.slice(i, i + CONC);
    const results = await Promise.all(
      batch.map(async (p) => ({ ...p, detail: await scrapeProductDetail(p.url) }))
    );
    for (const p of results) {
      done++;
      const base = {
        name: p.name,
        slug: p.slug,
        url: p.url,
        image: p.image,
        images: p.image ? [p.image] : [],
        unitePrice: p.unitePrice,
        salePrice: p.salePrice,
        breadcrumbCatSlug: p.catId,
        breadcrumbSubName: p.subId,
        relatedSubs: subNamesByCat.get(p.catId) || [],
      };
      if (!p.detail) {
        detailed.push(base);
      } else {
        if (p.detail.outOfStock) {
          console.log(`  ${done}/${all.length} skipped (out of stock): ${p.name}`);
          continue;
        }
        detailed.push({
          ...base,
          name: p.detail.title || p.name,
          // The detail page is authoritative, but its two prices must be taken
          // as a pair: mixing a detail price with a listing discount can
          // resurrect the sale > unite inversion.
          unitePrice: p.detail.unitePrice || p.unitePrice,
          salePrice: p.detail.unitePrice ? p.detail.salePrice : p.salePrice,
          images: p.detail.images.length ? p.detail.images : base.images,
        });
      }
      if (done % 10 === 0 || done === all.length) console.log(`  ${done}/${all.length}`);
    }
  }

  // Only emit categories (and subs) that actually carry products. A branch with
  // none is dead weight in the seeded navigation.
  const keptSlugs = new Set(detailed.map((p) => p.breadcrumbCatSlug));
  const keptSubSlugs = new Set(detailed.map((p) => p.breadcrumbSubName).filter(Boolean));

  const categories = cats
    .filter((c) => keptSlugs.has(c.id))
    .map((c) => ({
      name: c.name,
      slug: c.id,
      subs: c.subs.filter((s) => keptSubSlugs.has(s.id)).map((s) => ({ name: s.name, slug: s.id })),
    }));

  const dropped = cats.filter((c) => !keptSlugs.has(c.id)).map((c) => c.name);
  if (dropped.length) {
    console.log(`\nDropped ${dropped.length} category/categories that yielded no products: ${dropped.join(', ')}`);
  }

  const catalog = {
    fetchedAt: new Date().toISOString(),
    source: BASE,
    categories,
    products: detailed,
  };

  fs.writeFileSync(OUT, JSON.stringify(catalog, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✓ Wrote ${detailed.length} products + ${categories.length} categories to catalogData.json`);
  console.log(`=== Fetch complete in ${elapsed}s ===`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
