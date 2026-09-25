const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const BASE = 'https://2inshop.com';
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

function productShowSlug(href) {
  const m = (href || '').match(/\/product-show\/(\d+)/);
  return m ? m[1] : (href || '').split('/').filter(Boolean).pop() || null;
}

// ——— Scrape categories + subcategories from the products-list sidebar ———
async function scrapeCategories() {
  console.log('Fetching products-list for categories…');
  const html = await fetchHTML(`${BASE}/products-list`);
  const $ = cheerio.load(html);
  const cats = new Map(); // id -> { name, image, href, subs }
  const subSeen = new Set();

  $('.submenu-inner').each((_, el) => {
    const $el = $(el);
    const $title = $el.find('h4.submenu-title a');
    const catId = ($title.attr('href') || '').match(/category_id=(\d+)/);
    if (!catId) return;
    const cid = catId[1];
    const cname = $title.text().trim();
    if (!cid || !cname) return;

    if (!cats.has(cid)) {
      cats.set(cid, { name: cname, slug: cid, href: `${BASE}/products-list?category_id=${cid}`, subs: [] });
    }
    const cat = cats.get(cid);

    $el.find('a.submenu-link').each((_, a) => {
      const href = ($(a).attr('href') || '').replace(/&amp;/g, '&');
      const m = href.match(/category_id=(\d+)&(?:amp;)?sub_category_id=(\d+)/);
      if (!m || m[1] !== cid) return;
      const sid = m[2];
      const sname = $(a).text().trim();
      if (!sname || subSeen.has(`${cid}-${sid}`)) return;
      subSeen.add(`${cid}-${sid}`);
      cat.subs.push({ name: sname, slug: sid, href: `${BASE}/products-list?category_id=${cid}&sub_category_id=${sid}` });
    });
  });

  // Side main menu (li.clickable) — add categories/subs not already covered
  $('#category-list li.clickable').each((_, el) => {
    const $el = $(el);
    const name = $el.find('> a > span').first().text().trim();
    if (!name) return;
    let found = null;
    $el.find('a.sub-category-item').each((_, a) => {
      const href = ($(a).attr('href') || '').replace(/&amp;/g, '&');
      const m = href.match(/category_id=(\d+)&(?:amp;)?sub_category_id=(\d+)/);
      if (m) {
        const cid = m[1], sid = m[2];
        if (!cats.has(cid)) cats.set(cid, { name, slug: cid, href: `${BASE}/products-list?category_id=${cid}`, subs: [] });
        const cat = cats.get(cid);
        const sname = $(a).text().trim();
        if (sname && !subSeen.has(`${cid}-${sid}`)) {
          subSeen.add(`${cid}-${sid}`);
          cat.subs.push({ name: sname, slug: sid, href: `${BASE}/products-list?category_id=${cid}&sub_category_id=${sid}` });
        }
        if (!found) found = cats.get(cid);
      }
    });
    if (!found) {
      // category with no sub links yet — try to match by name
      for (const c of cats.values()) { if (c.name === name) { found = c; break; } }
      if (!found) cats.set(String(cats.size + 1), { name, slug: null, href: `${BASE}/products-list`, subs: [] });
    }
  });

  const list = [...cats.values()].filter(c => c.slug);
  console.log(`  → ${list.length} categories found`);
  return list;
}

// ——— Parse product items from a products-list page ———
function parseListPage(html) {
  const $ = cheerio.load(html);
  const items = [];
  $('div.box[data-product-url]').each((_, el) => {
    const $e = $(el);
    const url = $e.attr('data-product-url');
    const name = $e.find('h5.title a').text().trim();
    const image = $e.find('img.product_img.main_img').attr('src') || '';
    const uPrice = parsePrice($e.find('.price.current-price').first().text());
    const sPrice = parsePrice($e.find('.price.old-price').first().text());
    const isStock = $e.find('input[name="is_stock"]').attr('value');
    items.push({
      name, slug: productShowSlug(url), url, image,
      unitePrice: uPrice || sPrice || 0,
      salePrice: uPrice ? sPrice || null : null,
      isStock: isStock,
    });
  });
  return items;
}

// ——— Scrape products from a category/subcategory URL (with pagination) ———
async function scrapeCategoryProducts(url) {
  const products = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const pageUrl = page === 1 ? url : url.includes('?') ? `${url}&page=${page}` : `${url}?page=${page}`;
    try {
      const html = await fetchHTML(pageUrl);
      const items = parseListPage(html);
      products.push(...items);
      hasNext = items.length > 0 && page < 50;
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

    const outOfStock = $('div.single_out_stock.out-of-stock').length > 0 ||
      $('input[name="is_stock"]').attr('value') === '-1';

    const title = $('h2.product-title').text().trim() ||
      $('title').text().replace(/\s*-\s*2inshop\s*$/, '').trim();

    const $price = $('.product-price-variant');
    const uPrice = parsePrice($price.find('.price-display').first().text());
    const sPriceRaw = parsePrice($price.find('del .price').first().text() || $price.find('del').first().text());

    const images = [];
    const seen = new Set();
    $('a.popup-zoom').each((_, a) => {
      const src = $(a).attr('href');
      if (src && !seen.has(src)) { seen.add(src); images.push(src.startsWith('http') ? src : BASE + src); }
    });
    if (!images.length) {
      const main = $('img.drift-demo-trigger.main-product-img').attr('src');
      if (main) images.push(main);
    }

    // Breadcrumb-ish: related subcategories from the page sidebar
    const subNames = [];
    $('a.submenu-link').each((_, a) => {
      const n = $(a).text().trim();
      if (n && subNames.length < 3) subNames.push(n);
    });

    return {
      title, unitePrice: uPrice || 0, salePrice: sPriceRaw,
      images, outOfStock, relatedSubs: subNames,
    };
  } catch (e) {
    console.error(`    ✗ ${e.message}`);
    return null;
  }
}

// ——— Main ———
async function main() {
  const startTime = Date.now();
  console.log('=== Fetch Catalog from 2inshop.com ===\n');

  const cats = await scrapeCategories();

  // Collect product URLs per category
  console.log('\nScraping product listings…');
  const all = [];
  const stockStatus = new Map();
  const seen = new Set();

  for (const c of cats) {
    const pp = await scrapeCategoryProducts(c.href);
    console.log(`  ${c.name}: ${pp.length} listed`);
    for (const p of pp) {
      if (!stockStatus.has(p.slug)) stockStatus.set(p.slug, p.isStock);
      if (p.isStock !== '-1' && !seen.has(p.slug)) {
        seen.add(p.slug);
        all.push({ ...p, catSlug: c.slug });
      }
    }
    for (const s of c.subs) {
      const sp = await scrapeCategoryProducts(s.href);
      console.log(`    ${s.name}: ${sp.length} listed`);
      for (const p of sp) {
        if (!stockStatus.has(p.slug)) stockStatus.set(p.slug, p.isStock);
        if (p.isStock !== '-1' && !seen.has(p.slug)) {
          seen.add(p.slug);
          all.push({ ...p, catSlug: c.slug, subSlug: s.slug });
        }
      }
    }
  }

  console.log(`\nTotal unique in-stock product URLs: ${all.length}`);

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
        if (p.detail.outOfStock) {
          stockStatus.set(p.slug, '-1');
          console.log(`  ${done}/${all.length} skipped (out of stock): ${p.name}`);
          continue;
        }
        detailed.push({
          name: p.detail.title && p.detail.title !== '2inshop || Best Online shop' ? p.detail.title : p.name,
          slug: p.slug,
          url: p.url,
          image: p.image,
          unitePrice: p.detail.unitePrice || p.unitePrice,
          salePrice: p.detail.salePrice || p.salePrice,
          images: p.detail.images.length ? p.detail.images : (p.image ? [p.image] : []),
          breadcrumbCatSlug: p.catSlug,
          breadcrumbSubName: p.subSlug || null,
          relatedSubs: p.detail.relatedSubs,
        });
      } else {
        detailed.push({
          name: p.name,
          slug: p.slug,
          url: p.url,
          image: p.image,
          unitePrice: p.unitePrice,
          salePrice: p.salePrice,
          images: p.image ? [p.image] : [],
          breadcrumbCatSlug: p.catSlug,
          breadcrumbSubName: p.subSlug || null,
        });
      }
      if (done % 10 === 0 || done === all.length)
        console.log(`  ${done}/${all.length}`);
    }
  }

  // Filter out products confirmed out of stock via detail
  const categories = cats.map((c) => ({
    name: c.name,
    slug: c.slug,
    subs: c.subs.map((s) => ({ name: s.name, slug: s.slug })),
  }));

  const catalog = {
    fetchedAt: new Date().toISOString(),
    source: BASE,
    categories,
    products: detailed,
  };

  fs.writeFileSync(OUT, JSON.stringify(catalog, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✓ Wrote ${detailed.length} in-stock products + ${categories.length} categories to catalogData.json`);
  console.log(`=== Fetch complete in ${elapsed}s ===`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
