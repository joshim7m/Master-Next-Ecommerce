const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const BASE = 'https://www.eghuri.com';
const OUT = path.join(__dirname, 'catalogData.json');
const CONC = 5;
const TIMEOUT = 20000;

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

function parsePrice(text) {
  if (!text) return null;
  const n = parseFloat(text.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

// ——— Scrape categories from homepage mobile menu ———
async function scrapeCategories() {
  console.log('Fetching homepage for categories…');
  const html = await fetchHTML(BASE);
  const $ = cheerio.load(html);
  const cats = [];

  $('.mobile-menu .first-nav > .parent-category').each((_, el) => {
    const $el = $(el);
    const $link = $el.find('> a.menu-category-name');
    const href = $link.attr('href') || '';
    const name = $link.clone().children().remove().end().text().trim();
    const image = $link.find('img.side_cat_img').attr('src') || '';
    const slug = href.replace(/^https?:\/\/[^/]+\/category\//, '');

    if (!slug || href.includes('order-track')) return;

    const subs = [];
    $el.find('.second-nav > .parent-subcategory').each((_, subEl) => {
      const $a = $(subEl).find('> .menu-subcategory-name');
      const sh = $a.attr('href') || '';
      const sn = $a.text().trim();
      const ss = sh.replace(/^https?:\/\/[^/]+\/subcategory\//, '');
      if (sn) subs.push({ name: sn, slug: ss, href: sh.startsWith('http') ? sh : BASE + sh });
    });

    cats.push({
      name, slug, image: image || null,
      href: href.startsWith('http') ? href : BASE + href, subs,
    });
  });

  console.log(`  → ${cats.length} categories found`);
  return cats;
}

// ——— Scrape products from a category/subcategory page (with pagination) ———
async function scrapeCategoryProducts(url) {
  const products = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const pageUrl = page === 1 ? url : `${url}?page=${page}`;
    try {
      const html = await fetchHTML(pageUrl);
      const $ = cheerio.load(html);

      const pageProducts = [];
      $('.product_item.wist_item').each((_, el) => {
        const $e = $(el);
        const $imgLink = $e.find('.pro_img a');
        const $nameLink = $e.find('.pro_name a');
        const productUrl = $imgLink.attr('href') || $nameLink.attr('href') || '';
        const name = $nameLink.text().trim();
        const image = $e.find('.pro_img img').attr('src') || '';

        const $price = $e.find('.pro_price p');
        let uPrice = null, sPrice = null;
        const $del = $price.find('del');
        if ($del.length) {
          uPrice = parsePrice($del.text());
          sPrice = parsePrice($price.clone().children('del').remove().end().text());
        } else {
          uPrice = parsePrice($price.text());
        }

        if (productUrl && name) {
          const full = productUrl.startsWith('http') ? productUrl : BASE + productUrl;
          const slug = full.replace(/^https?:\/\/[^/]+\/product\//, '');
          pageProducts.push({ name, slug, url: full, image, unitePrice: uPrice, salePrice: sPrice });
        }
      });

      products.push(...pageProducts);

      const $next = $('a.page-link[rel="next"]');
      hasNext = $next.length > 0 && pageProducts.length > 0;
      page++;
    } catch (e) {
      console.error(`    ✗ Page ${page}: ${e.message}`);
      hasNext = false;
    }
  }

  return products;
}

// ——— Scrape product detail page ———
async function scrapeProductDetail(url) {
  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    const title = $('p.name').text().trim() ||
      $('title').text().replace(/\s*-\s*Eghuri\s*$/, '').trim();

    const $price = $('p.details-price');
    let uPrice = null, sPrice = null;
    const $del = $price.find('del');
    if ($del.length) {
      uPrice = parsePrice($del.text());
      sPrice = parsePrice($price.clone().children('del').remove().end().text());
    } else {
      sPrice = parsePrice($price.text());
      uPrice = sPrice;
    }

    const images = [];
    $('.details_slider .dimage_item img').each((_, el) => {
      const src = $(el).attr('src');
      if (src) images.push(src);
    });

    let breadcrumbCatSlug = null;
    let breadcrumbSubName = null;

    const $crumbs = $('.breadcrumb ul li a');
    $crumbs.each((_, el) => {
      const href = $(el).attr('href') || '';
      const m = href.match(/\/category\/(.+)$/);
      if (m) breadcrumbCatSlug = m[1];
    });

    const $allLis = $('.breadcrumb ul li');
    $allLis.each((i, li) => {
      const $a = $(li).find('a');
      const href = $a.attr('href') || '';
      const text = $a.text().trim();
      if (i <= 1) return;
      if (href.includes('/category/')) return;
      if (text && (href === '#' || href === '')) {
        breadcrumbSubName = text;
      }
    });

    return {
      title, unitePrice: uPrice || 0, salePrice: sPrice,
      images, breadcrumbCatSlug, breadcrumbSubName,
    };
  } catch (e) {
    console.error(`    ✗ ${e.message}`);
    return null;
  }
}

// ——— Main ———
async function main() {
  const startTime = Date.now();
  console.log('=== Fetch Catalog from eghuri.com ===\n');

  const cats = await scrapeCategories();

  // Collect all product URLs per category
  console.log('\nScraping product URLs…');
  const all = [];
  const seen = new Set();

  for (const c of cats) {
    const pp = await scrapeCategoryProducts(c.href);
    console.log(`  ${c.name}: ${pp.length} products`);
    for (const p of pp) {
      if (!seen.has(p.url)) { seen.add(p.url); all.push(p); }
    }
    for (const s of c.subs) {
      const sp = await scrapeCategoryProducts(s.href);
      console.log(`    ${s.name}: ${sp.length} products`);
      for (const p of sp) {
        if (!seen.has(p.url)) { seen.add(p.url); all.push(p); }
      }
    }
  }

  console.log(`\nTotal unique product URLs: ${all.length}`);

  // Fetch details for each product
  console.log('\nFetching product details…');
  let done = 0;
  const detailed = [];

  for (let i = 0; i < all.length; i += CONC) {
    const batch = all.slice(i, i + CONC);
    const results = await Promise.all(
      batch.map(async (p) => {
        const d = await scrapeProductDetail(p.url);
        return { ...p, detail: d };
      }),
    );
    for (const p of results) {
      done++;
      if (p.detail) {
        detailed.push({
          name: p.detail.title || p.name,
          slug: p.slug,
          url: p.url,
          image: p.image,
          unitePrice: p.detail.unitePrice,
          salePrice: p.detail.salePrice,
          images: p.detail.images,
          breadcrumbCatSlug: p.detail.breadcrumbCatSlug,
          breadcrumbSubName: p.detail.breadcrumbSubName,
        });
      }
      if (done % 10 === 0 || done === all.length)
        console.log(`  ${done}/${all.length}`);
    }
  }

  const catalog = {
    fetchedAt: new Date().toISOString(),
    categories: cats.map(c => ({
      name: c.name, slug: c.slug, image: c.image,
      subs: c.subs.map(s => ({ name: s.name, slug: s.slug })),
    })),
    products: detailed,
  };

  fs.writeFileSync(OUT, JSON.stringify(catalog, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✓ Wrote ${detailed.length} products + ${cats.length} categories to catalogData.json`);
  console.log(`=== Fetch complete in ${elapsed}s ===`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
