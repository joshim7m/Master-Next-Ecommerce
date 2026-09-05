const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const DATA_FILE = path.join(__dirname, 'catalogData.json');

function slugify(text) {
  return text
    .toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-')
    .substring(0, 200);
}

const usedSlugs = new Set();
function uniqueSlug(text) {
  let base = slugify(text);
  if (!base) base = 'item';
  let slug = base;
  let i = 2;
  while (usedSlugs.has(slug)) slug = `${base}-${i++}`;
  usedSlugs.add(slug);
  return slug;
}

const usedSkus = new Set();
function generateSku() {
  let sku;
  do { sku = String(Math.floor(100000 + Math.random() * 900000)); }
  while (usedSkus.has(sku));
  usedSkus.add(sku);
  return sku;
}

async function main() {
  const startTime = Date.now();
  console.log('=== Catalog Seed (from catalogData.json) ===\n');

  if (!fs.existsSync(DATA_FILE)) {
    console.error('✗ catalogData.json not found. Run `npm run fetch-catalog` first.');
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  console.log(`Data fetched at: ${catalog.fetchedAt}`);
  console.log(`Categories: ${catalog.categories.length}`);
  console.log(`Products: ${catalog.products.length}\n`);

  // 1. Seed categories
  console.log('Seeding categories…');
  const catMap = {};

  for (const c of catalog.categories) {
    const r = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, image: c.image },
      create: { name: c.name, slug: c.slug, image: c.image },
    });
    catMap[c.slug] = r.id;
    console.log(`  ✓ ${c.name}`);

    for (const s of c.subs) {
      const sr = await prisma.category.upsert({
        where: { slug: s.slug },
        update: { name: s.name, parentId: r.id },
        create: { name: s.name, slug: s.slug, parentId: r.id },
      });
      catMap[s.slug] = sr.id;
      console.log(`    ✓ ${s.name}`);
    }
  }

  // Build name → slug lookup
  const nameToSlug = {};
  for (const c of catalog.categories) {
    nameToSlug[c.name.toLowerCase()] = c.slug;
    for (const s of c.subs) nameToSlug[s.name.toLowerCase()] = s.slug;
  }

  // 2. Seed products
  console.log('\nSeeding products…');
  let done = 0;

  for (const p of catalog.products) {
    let targetSlug = null;

    if (p.breadcrumbSubName) {
      const subSlug = nameToSlug[p.breadcrumbSubName.toLowerCase()];
      if (subSlug && catMap[subSlug]) targetSlug = subSlug;
    }

    if (!targetSlug && p.breadcrumbCatSlug && catMap[p.breadcrumbCatSlug]) {
      targetSlug = p.breadcrumbCatSlug;
    }

    if (!targetSlug) {
      for (const slug of Object.keys(catMap)) {
        if (p.slug.startsWith(slug.replace(/-/g, ''))) {
          targetSlug = slug;
          break;
        }
      }
    }

    try {
      const catId = targetSlug ? catMap[targetSlug] : undefined;

      const allTags = [...(p.tags || []), ...(p.tags_bn || [])];
      const productTags = allTags.length
        ? allTags.join(', ')
        : p.name.split(/[–\-,]/)[0].trim().toLowerCase();

      const metaEn = p.metaDescription || '';
      const metaBn = p.metaDescription_bn || '';
      const productMetaDesc = [metaEn, metaBn].filter(Boolean).join(' ') || null;

      await prisma.product.upsert({
        where: { slug: p.slug },
        update: {},
        create: {
          title: p.name,
          slug: p.slug,
          sku: generateSku(),
          description: [p.description, p.description_bn].filter(Boolean).join('\n'),
          metaDescription: productMetaDesc,
          tags: productTags,
          unite_price: p.unitePrice,
          sale_price: p.salePrice || null,
          quantity: 10,
          status: 'publish',
          categories: catId ? { connect: { id: catId } } : undefined,
          images: {
            create: p.images && p.images.length > 0
              ? p.images.map((img, idx) => ({
                  image_path: img,
                  altText: idx === 0 ? p.name : `${p.name} — Image ${idx + 1}`,
                }))
              : [{ image_path: p.image, altText: p.name }],
          },
        },
      });
      done++;
      if (done % 10 === 0 || done === catalog.products.length)
        console.log(`  ${done}/${catalog.products.length}`);
    } catch (e) {
      console.error(`  ✗ ${p.name}: ${e.message}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✓ ${done} products seeded`);
  console.log(`=== Catalog seed complete in ${elapsed}s ===`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
