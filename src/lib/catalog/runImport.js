import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { mkdir, copyFile, writeFile } from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse';
import ExcelJS from 'exceljs';
import AdmZip from 'adm-zip';
import prisma from '@/src/lib/prisma';
import { getUploadPath } from '@/src/lib/storage';
import { CHUNK_SIZE, VALID_PRODUCT_STATUSES, IMAGE_FOLDERS, COLUMN_KEY_MAP } from './constants';
import { sanitizeFilename, isRemotePath, resolveStoredImage, fetchRemoteImage } from './images';

/** Guard against a pathological parent chain before it becomes a stack issue. */
const MAX_PARENT_DEPTH = 25;

export async function importCatalogFile(filePath, originalName, workDir) {
  const extension = path.extname(originalName).toLowerCase();
  const report = createReport();

  // Product id -> (archive image filename -> ProductImage id). Populated by
  // importProductImages so variants.csv can attach an image to the parent's rows.
  const context = { imageIdsByProduct: new Map() };

  if (extension === '.zip') {
    const extractedDir = path.join(workDir, 'extracted');
    await mkdir(extractedDir, { recursive: true });
    extractZipGuarded(filePath, extractedDir);

    const fileAt = (name) => path.join(extractedDir, name);

    // Order is load-bearing:
    //  1. categories - product rows link to them by slug; parents resolve
    //  2. products   - creates the ProductImage rows variants point at
    //  3. options    - needs product ids
    //  4. variants   - needs product ids AND their image ids (step 2)
    //  5. upsells    - needs two product ids
    if (existsSync(fileAt('categories.csv'))) await importCategories(fileAt('categories.csv'), extractedDir, report);
    if (existsSync(fileAt('products.csv'))) await importProducts(fileAt('products.csv'), extractedDir, report, context);
    if (existsSync(fileAt('options.csv'))) await importOptions(fileAt('options.csv'), report);
    if (existsSync(fileAt('variants.csv'))) await importVariants(fileAt('variants.csv'), report, context);
    if (existsSync(fileAt('upsells.csv'))) await importUpsells(fileAt('upsells.csv'), report);

    return finalizeReport(report);
  }

  const fileType = await detectFileType(filePath, extension);

  switch (fileType) {
    case 'categories':
      await importCategories(filePath, '', report);
      break;
    case 'options':
      await importOptions(filePath, report);
      break;
    case 'variants':
      await importVariants(filePath, report, context);
      break;
    case 'upsells':
      await importUpsells(filePath, report);
      break;
    default:
      await importProducts(filePath, '', report, context);
  }

  return finalizeReport(report);
}

/* ------------------------------------------------------------------- categories */

/**
 * Categories are upserted by slug — deliberately, so a hierarchy or image that
 * went wrong can be repaired by re-importing. Products and variants stay
 * create-only.
 *
 * Parenting runs as a second pass over the collected rows: writing `parentId`
 * inline would make the result depend on whether the parent happened to appear
 * earlier in the file.
 */
async function importCategories(filePath, extractedDir, report) {
  const errors = [];
  const rows = [];
  const slugToId = new Map(
    (await prisma.category.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id])
  );

  let imported = 0;
  let skipped = 0;

  for await (const batch of rowStream(filePath)) {
    for (const { row, rowNumber } of batch) {
      const name = clean(row.name);

      if (!name) {
        rowError(errors, rowNumber, 'Name is required.');
        skipped++;
        continue;
      }

      // Upsert-by-slug, so a wrong parent or a missing image is repairable by
      // re-importing.
      const baseSlug = clean(row.slug) || slugify(name);
      const existingId = slugToId.get(baseSlug);
      // uniqueSlug() only guards against two rows *inside* one file claiming the
      // same slug — it must never run before the existence check, or an existing
      // category would be renamed to `name-2` and duplicated instead of updated
      // (docs §7.3).
      const slug = existingId ? baseSlug : uniqueSlug(baseSlug, slugToId);
      const image = await importCategoryImage(row.image, extractedDir, errors, rowNumber);

      const data = {
        name,
        description: clean(row.description),
        // An empty Image cell means "not supplied" — never wipe what is already there.
        ...(image ? { image } : {}),
      };

      let category;
      if (existingId) {
        category = await prisma.category.update({ where: { slug: baseSlug }, data });
      } else {
        category = await prisma.category.create({ data: { ...data, slug } });
        slugToId.set(slug, category.id);
      }

      rows.push({ id: category.id, slug, parentSlug: clean(row.parent_slug), rowNumber });
      imported++;
    }
  }

  // Pass 2 — every category exists now, so parents resolve regardless of row order.
  for (const { id, slug, parentSlug, rowNumber } of rows) {
    if (!parentSlug) {
      await prisma.category.update({ where: { id }, data: { parentId: null } });
      continue;
    }

    if (parentSlug === slug) {
      rowError(errors, rowNumber, `Category "${slug}" cannot be its own parent.`);
      continue;
    }

    const parentId = slugToId.get(parentSlug);
    if (!parentId) {
      rowError(errors, rowNumber, `Parent category "${parentSlug}" not found.`);
      continue;
    }
    if (parentId === id) {
      rowError(errors, rowNumber, `Category "${slug}" cannot be its own parent.`);
      continue;
    }

    await prisma.category.update({ where: { id }, data: { parentId } });
  }

  const cycles = await findCategoryCycles();
  for (const slug of cycles) {
    rowError(errors, null, `Category "${slug}" was skipped: it would create a parent cycle.`);
  }

  tally(report, 'categories', imported, skipped, errors);
}

async function importCategoryImage(imageColumn, extractedDir, errors, rowNumber) {
  const name = clean(imageColumn);
  if (!name) return null; // blank is "no image", not an error

  const source = locateImage(extractedDir, name, IMAGE_FOLDERS.categories);
  if (!source) {
    rowError(errors, rowNumber, `Category image "${name}" not found.`);
    return null;
  }

  const filename = sanitizeFilename(name);
  const target = getUploadPath(IMAGE_FOLDERS.categories, filename);
  if (!target) {
    rowError(errors, rowNumber, `Category image "${name}" could not be resolved to a storage path.`);
    return null;
  }

  try {
    await mkdir(path.dirname(target), { recursive: true });

    if (source.remote) {
      const buffer = await fetchRemoteImage(source.url);
      if (!buffer) {
        rowError(errors, rowNumber, `Category image "${name}" could not be downloaded.`);
        return null;
      }
      await writeFile(target, buffer);
    } else {
      await copyFile(source.path, target);
    }

    return `/api/files/${IMAGE_FOLDERS.categories}/${filename}`;
  } catch {
    rowError(errors, rowNumber, `Category image "${name}" could not be saved.`);
    return null;
  }
}

/** Categories whose parentId chain revisits a node, i.e. would loop forever. */
async function findCategoryCycles() {
  const categories = await prisma.category.findMany({ select: { id: true, slug: true, parentId: true } });
  const parentById = new Map(categories.map((c) => [c.id, c.parentId]));
  const slugById = new Map(categories.map((c) => [c.id, c.slug]));

  const cyclic = new Set();

  for (const { id } of categories) {
    const seen = new Set([id]);
    let cursor = parentById.get(id);
    let depth = 0;

    while (cursor && depth < MAX_PARENT_DEPTH) {
      if (seen.has(cursor)) {
        cyclic.add(slugById.get(id));
        break;
      }
      seen.add(cursor);
      cursor = parentById.get(cursor);
      depth++;
    }
  }

  return [...cyclic].filter(Boolean);
}

/* --------------------------------------------------------------------- products */

async function importProducts(filePath, extractedDir, report, context) {
  const existingSkus = new Set(
    (await prisma.product.findMany({ select: { sku: true } })).map((p) => p.sku?.trim()).filter(Boolean)
  );
  const seenSlugs = new Set((await prisma.product.findMany({ select: { slug: true } })).map((p) => p.slug));
  const errors = [];

  let imported = 0;
  let skipped = 0;

  for await (const batch of rowStream(filePath)) {
    for (const { row, rowNumber } of batch) {
      const sku = clean(row.sku);

      if (sku && existingSkus.has(sku)) {
        skipped++;
        continue;
      }

      const title = clean(row.title);
      const unitPrice = priceOf(row.unit_price);

      if (!title) {
        rowError(errors, rowNumber, 'Title is required.');
        skipped++;
        continue;
      }
      if (unitPrice === null) {
        rowError(errors, rowNumber, 'Unit price is required.');
        skipped++;
        continue;
      }
      // Product.sku is non-nullable and unique. Writing null here aborts the whole
      // request, so a blank cell has to be a row-level error instead.
      if (!sku) {
        rowError(errors, rowNumber, 'SKU is required (the column is not nullable).');
        skipped++;
        continue;
      }

      const status = (clean(row.status) || 'draft').toLowerCase();
      if (!VALID_PRODUCT_STATUSES.includes(status)) {
        rowError(errors, rowNumber, `Invalid status "${status}". Allowed: ${VALID_PRODUCT_STATUSES.join(', ')}.`);
        skipped++;
        continue;
      }

      const slug = uniqueSlug(clean(row.slug) || slugify(title), seenSlugs);

      const product = await prisma.product.create({
        data: {
          title,
          slug,
          sku,
          description: clean(row.description),
          specification: clean(row.specification),
          metaDescription: clean(row.meta_description),
          tags: clean(row.tags),
          videoUrl: clean(row.video_url),
          featured: truthy(row.featured),
          unite_price: unitPrice,
          sale_price: priceOf(row.sale_price),
          quantity: intOrNull(row.quantity),
          status,
        },
      });

      const categoryIds = await resolveCategoryIds(row);
      if (categoryIds.length) {
        await prisma.product.update({
          where: { id: product.id },
          data: { categories: { set: categoryIds } },
        });
      }

      existingSkus.add(sku);
      seenSlugs.add(slug);

      await importProductImages(product, extractedDir, row.images, row.image_alt_texts, rowNumber, errors, context);
      imported++;
    }
  }

  tally(report, 'products', imported, skipped, errors);
}

/**
 * Category links resolve from the slug column first, falling back to the name
 * column so archives predating it still work and a bare products.csv stays
 * self-sufficient.
 *
 * The fallback has to be careful. Slugifying a name is only correct when the
 * category actually has an auto-generated slug; a category with a custom slug
 * (Name "Root Parent", Slug "custom-parent-slug") would otherwise be duplicated
 * under `root-parent` on every import. So an already-slug-linked category is
 * matched by name before anything is created.
 */
async function resolveCategoryIds(row) {
  const found = [];
  const linkedNames = new Set();

  for (const slug of splitList(row.category_slugs)) {
    const category = await prisma.category.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });
    if (!category) continue;

    found.push(category);
    linkedNames.add(category.name.trim().toLowerCase());
  }

  const names = splitList(row.categories).filter((name) => !linkedNames.has(name.toLowerCase()));

  if (names.length) {
    const existing = await prisma.category.findMany({
      where: { name: { in: names, mode: 'insensitive' } },
      select: { id: true, name: true },
    });
    const byName = new Map(existing.map((c) => [c.name.trim().toLowerCase(), c]));

    for (const name of names) {
      const match = byName.get(name.toLowerCase());
      if (match) {
        found.push(match);
        continue;
      }

      const slug = slugify(name);
      found.push(
        await prisma.category.upsert({ where: { slug }, update: {}, create: { name, slug } })
      );
    }
  }

  return [...new Map(found.map((c) => [c.id, c])).values()];
}

async function importProductImages(product, extractedDir, imagesColumn, altColumn, rowNumber, errors, context) {
  const names = splitList(imagesColumn);
  const altTexts = splitList(altColumn);
  const idsForProduct = new Map();

  for (const [index, name] of names.entries()) {
    const source = locateImage(extractedDir, name, IMAGE_FOLDERS.products);

    if (!source) {
      rowError(errors, rowNumber, `Image "${name}" not found.`);
      continue;
    }

    const ext = path.extname(sanitizeFilename(name)) || '.jpg';
    const filename = `${product.slug}-${index}${ext}`;
    const target = getUploadPath(IMAGE_FOLDERS.products, filename);

    if (!target) {
      rowError(errors, rowNumber, `Image "${name}" could not be resolved to a storage path.`);
      continue;
    }

    try {
      await mkdir(path.dirname(target), { recursive: true });

      if (source.remote) {
        const buffer = await fetchRemoteImage(source.url);
        if (!buffer) {
          rowError(errors, rowNumber, `Image "${name}" could not be downloaded.`);
          continue;
        }
        await writeFile(target, buffer);
      } else {
        await copyFile(source.path, target);
      }

      const image = await prisma.productImage.create({
        data: {
          productId: product.id,
          image_path: `/api/files/${IMAGE_FOLDERS.products}/${filename}`,
          altText: clean(altTexts[index]),
        },
      });

      // Recorded under the name as it appeared in the CSV, so variants.csv can
      // point at this row via the same filename it exported.
      idsForProduct.set(path.basename(name), image.id);
      idsForProduct.set(filename, image.id);
    } catch {
      rowError(errors, rowNumber, `Image "${name}" could not be saved.`);
    }
  }

  if (idsForProduct.size) context.imageIdsByProduct.set(product.id, idsForProduct);
}

/* --------------------------------------------------------------------- options */

async function importOptions(filePath, report) {
  const errors = [];
  const bySlug = new Map();

  for await (const batch of rowStream(filePath)) {
    for (const { row } of batch) {
      const slug = clean(row.product_slug);
      const name = clean(row.name);
      if (!slug || !name) continue;

      if (!bySlug.has(slug)) bySlug.set(slug, []);
      const list = bySlug.get(slug);
      list.push({ name, position: intOrNull(row.position) ?? list.length });
    }
  }

  let imported = 0;
  let skipped = 0;

  for (const [slug, options] of bySlug) {
    const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!product) {
      rowError(errors, null, `Options for "${slug}" skipped: product not found.`);
      skipped++;
      continue;
    }

    // Positions are unique per product; replace wholesale so a re-import cannot
    // trip the @@unique([productId, position]) constraint.
    await prisma.productOption.deleteMany({ where: { productId: product.id } });
    await prisma.productOption.createMany({
      data: options.map((o) => ({ productId: product.id, name: o.name, position: o.position })),
    });
    imported += options.length;
  }

  tally(report, 'options', imported, skipped, errors);
}

/* -------------------------------------------------------------------- variants */

async function importVariants(filePath, report, context) {
  const productsBySlug = new Map(
    (await prisma.product.findMany({ select: { id: true, slug: true } })).map((p) => [p.slug, p])
  );

  // ProductVariant.sku is nullable and not unique, so neither key alone is a safe
  // dedupe (docs §7.1). Both are tracked per product and a row is skipped if
  // *either* already exists — otherwise a file giving one row a SKU and another
  // the same options produces two variants of the identical combination.
  const seenByProduct = new Map();
  for (const variant of await prisma.productVariant.findMany({ select: { productId: true, sku: true, options: true } })) {
    if (!seenByProduct.has(variant.productId)) {
      seenByProduct.set(variant.productId, { skus: new Set(), options: new Set() });
    }
    const bucket = seenByProduct.get(variant.productId);

    if (variant.sku) bucket.skus.add(variant.sku);
    const list = normalizeOptionList(variant.options);
    if (list.length) bucket.options.add(JSON.stringify(list));
  }

  const errors = [];
  let imported = 0;
  let skipped = 0;

  for await (const batch of rowStream(filePath)) {
    for (const { row, rowNumber } of batch) {
      const slug = clean(row.product_slug);
      const product = slug ? productsBySlug.get(slug) : null;

      if (!product) {
        rowError(errors, rowNumber, `Product "${slug || ''}" not found for variant.`);
        skipped++;
        continue;
      }

      const options = parseOptions(row.options);
      const sku = clean(row.sku);
      const seen = seenByProduct.get(product.id) ?? { skus: new Set(), options: new Set() };

      const skuTaken = sku ? seen.skus.has(sku) : false;
      const optionsTaken = options.length > 0 && seen.options.has(JSON.stringify(options));

      if (skuTaken || optionsTaken) {
        skipped++;
        continue;
      }

      const imageId = await resolveVariantImageId(product, row.image, context);

      await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: sku || null,
          options,
          unite_price: priceOf(row.unit_price),
          sale_price: priceOf(row.sale_price),
          quantity: intOrNull(row.quantity) ?? 0,
          isDefault: truthy(row.is_default),
          imageId: imageId ?? null,
        },
      });

      if (sku) seen.skus.add(sku);
      if (options.length) seen.options.add(JSON.stringify(options));
      seenByProduct.set(product.id, seen);
      imported++;
    }
  }

  tally(report, 'variants', imported, skipped, errors);
}

/**
 * A variant's image must point at one of its parent product's own ProductImage
 * rows. Prefer the map built during this run, then fall back to matching a
 * pre-existing row — which is what makes variants importable against a product
 * that was skipped as a duplicate.
 */
async function resolveVariantImageId(product, imageColumn, context) {
  const name = clean(imageColumn);
  if (!name) return null;

  const archiveName = path.basename(name);

  const fromRun = context.imageIdsByProduct.get(product.id);
  if (fromRun) {
    const hit = fromRun.get(archiveName);
    if (hit) return hit;
  }

  // The exporter names files `{productSlug}-{index}-{storedBasename}`. For a product
  // that already existed, image_path still holds the original stored basename, so
  // strip the prefix we added and match on what is left.
  let storedName = archiveName;
  if (product.slug && storedName.startsWith(`${product.slug}-`)) {
    storedName = storedName.slice(product.slug.length + 1).replace(/^\d+-/, '');
  }

  if (!storedName || storedName === archiveName) return null;

  const images = await prisma.productImage.findMany({
    where: { productId: product.id },
    select: { id: true, image_path: true },
  });

  return images.find((image) => path.basename(String(image.image_path || '')) === storedName)?.id ?? null;
}

function normalizeOptionList(options) {
  return Array.isArray(options) ? options.map(String) : [];
}

/* --------------------------------------------------------------------- upsells */

async function importUpsells(filePath, report) {
  const productsBySlug = new Map(
    (await prisma.product.findMany({ select: { id: true, slug: true } })).map((p) => [p.slug, p])
  );
  const seen = new Set(
    (await prisma.productUpsell.findMany({ select: { productId: true, upsellId: true } })).map(
      (u) => `${u.productId}:${u.upsellId}`
    )
  );

  const errors = [];
  let imported = 0;
  let skipped = 0;

  for await (const batch of rowStream(filePath)) {
    for (const { row, rowNumber } of batch) {
      const product = productsBySlug.get(clean(row.product_slug));
      const upsell = productsBySlug.get(clean(row.upsell_product_slug));

      if (!product || !upsell) {
        rowError(errors, rowNumber, `Upsell skipped: product "${!product ? row.product_slug : ''}" or upsell "${!upsell ? row.upsell_product_slug : ''}" not found.`);
        skipped++;
        continue;
      }

      if (product.id === upsell.id) {
        rowError(errors, rowNumber, `Upsell skipped: "${product.slug}" cannot upsell itself.`);
        skipped++;
        continue;
      }

      const key = `${product.id}:${upsell.id}`;
      if (seen.has(key)) {
        skipped++;
        continue;
      }

      await prisma.productUpsell.create({
        data: {
          productId: product.id,
          upsellId: upsell.id,
          sortOrder: intOrNull(row.sort_order) ?? 0,
        },
      });

      seen.add(key);
      imported++;
    }
  }

  tally(report, 'upsells', imported, skipped, errors);
}

/* ----------------------------------------------------------------------- shared */

function createReport() {
  return { imported: 0, skipped: 0, errors: [], byType: {} };
}

function rowError(errors, rowNumber, message) {
  errors.push({ row: rowNumber ?? null, message });
}

function tally(report, type, imported, skipped, errors) {
  report.imported += imported;
  report.skipped += skipped;
  report.errors.push(...errors);
  report.byType[type] = { imported, skipped, errors };
}

function finalizeReport(report) {
  // Deterministic key order so the UI can render a fixed card layout.
  const byType = {};
  for (const key of ['categories', 'products', 'options', 'variants', 'upsells']) {
    if (report.byType[key]) byType[key] = report.byType[key];
  }
  return { imported: report.imported, skipped: report.skipped, errors: report.errors, byType };
}

/**
 * Child CSVs are checked first. `variants.csv` carries a `SKU` column, so falling
 * through to the products test would read it as a product file and report every
 * row as "Title is required" — a confusing failure for a file that is perfectly
 * valid on its own, since all of them resolve their product by slug from the DB.
 */
function classifyHeaders(headerKeys) {
  const has = (...keys) => keys.every((key) => headerKeys.includes(key));

  if (has('product_slug', 'upsell_product_slug')) return 'upsells';
  if (has('product_slug', 'options')) return 'variants';
  if (has('product_slug', 'name')) return 'options';
  if (headerKeys.includes('title') || headerKeys.includes('sku')) return 'products';
  if (headerKeys.includes('name')) return 'categories';

  return null;
}

async function detectFileType(filePath, extension) {
  let headerKeys;

  if (extension === '.xlsx') {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.worksheets[0];
    headerKeys = [];
    sheet.getRow(1).eachCell((cell) => {
      const key = normalizeKey(String(cell.value ?? ''));
      if (key) headerKeys.push(key);
    });
  } else {
    headerKeys = await new Promise((resolve, reject) => {
      const parser = parse({ bom: true, trim: true });
      createReadStream(filePath).pipe(parser);
      parser.once('data', (row) => {
        parser.destroy();
        resolve(row.map(normalizeKey).filter(Boolean));
      });
      parser.once('end', () => resolve([]));
      parser.once('error', reject);
    });
  }

  return (
    classifyHeaders(headerKeys) ??
    (() => {
      throw new Error(
        'Could not detect what this file contains. Expected headers for products (Title/SKU), categories (Name), options (Product Slug/Name), variants (Product Slug/Options) or upsells (Product Slug/Upsell Product Slug).'
      );
    })()
  );
}

async function* rowStream(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  let batch = [];

  if (extension === '.xlsx') {
    // Memory note: ExcelJS loads the whole sheet. Fine for typical catalogs (<~50k rows).
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.worksheets[0];
    const header = {};
    sheet.getRow(1).eachCell((cell, col) => {
      const key = normalizeKey(String(cell.value ?? ''));
      if (key) header[key] = col;
    });

    for (let r = 2; r <= sheet.rowCount; r++) {
      const cells = sheet.getRow(r).values;
      const row = {};
      for (const [key, col] of Object.entries(header)) row[key] = cells[col] ?? null;
      batch.push({ row, rowNumber: r });
      if (batch.length >= CHUNK_SIZE) {
        yield batch;
        batch = [];
      }
    }
  } else {
    const parser = parse({ bom: true, trim: true });
    createReadStream(filePath).pipe(parser);

    let headerKeys = null;
    // Counts physical CSV lines so an error can point at what the admin sees in
    // their spreadsheet: the header is line 1, the first data row is line 2.
    let r = 0;

    for await (const values of parser) {
      r++;
      if (!headerKeys) {
        headerKeys = values.map(normalizeKey);
        continue;
      }
      const row = {};
      headerKeys.forEach((key, i) => {
        if (key) row[key] = values[i] ?? null;
      });
      batch.push({ row, rowNumber: r });
      if (batch.length >= CHUNK_SIZE) {
        yield batch;
        batch = [];
      }
    }
  }

  if (batch.length) yield batch;
}

function locateImage(extractedDir, name, folder) {
  const basename = path.basename(name);

  if (extractedDir) {
    const inArchive = path.join(extractedDir, 'images', folder, basename);
    if (existsSync(inArchive)) return { path: inArchive };

    // Tolerate a flat images/ folder (archives without the per-entity subdirs).
    const flat = path.join(extractedDir, 'images', basename);
    if (existsSync(flat)) return { path: flat };
  }

  if (isRemotePath(name)) return { remote: true, url: name };

  const stored = resolveStoredImage(name);
  if (stored?.kind === 'local') return { path: stored.path };

  const legacy = getUploadPath(folder, basename);
  if (legacy && existsSync(legacy)) return { path: legacy };

  return null;
}

function extractZipGuarded(zipPath, extractTo) {
  const zip = new AdmZip(zipPath);
  const resolvedTarget = path.resolve(extractTo);

  for (const entry of zip.getEntries()) {
    const name = entry.entryName.replace(/\\/g, '/');

    if (name.includes('..') || path.isAbsolute(name) || /^[A-Za-z]:\//.test(name)) continue;
    if (entry.isDirectory) continue;

    const target = path.resolve(extractTo, name);
    if (target !== resolvedTarget && !target.startsWith(resolvedTarget + path.sep)) continue;

    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, entry.getData());
  }
}

function clean(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function priceOf(value) {
  const v = clean(value);
  if (v == null) return null;
  const n = parseFloat(v.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function intOrNull(value) {
  const n = parseInt(clean(value), 10);
  return Number.isFinite(n) ? Math.max(0, n) : null;
}

function truthy(value) {
  return ['true', '1', 'yes', 'y'].includes(String(clean(value) || '').toLowerCase());
}

function splitList(value) {
  const v = clean(value);
  if (!v) return [];
  return [...new Set(v.split(/[,;|]/).map((s) => s.trim()).filter(Boolean))];
}

/** Tolerates both the JSON array the exporter writes and a plain "M, Red" list. */
function parseOptions(value) {
  const v = clean(value);
  if (!v) return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed.map(String) : splitList(v);
  } catch {
    return splitList(v);
  }
}

function slugify(text) {
  const base = String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `item-${Date.now()}`;
}

function uniqueSlug(base, seen) {
  let slug = base;
  let suffix = 2;
  while (seen.has(slug)) slug = `${base}-${suffix++}`;
  return slug;
}

/**
 * Header cell -> row key. `normalizeKey('Category Slugs') === 'category_slugs'`,
 * so current headers need no mapping — only legacy spellings do (COLUMN_KEY_MAP).
 */
function normalizeKey(name) {
  const key = String(name)
    .replace(/^\xEF\xBB\xBF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return COLUMN_KEY_MAP[key] || key;
}