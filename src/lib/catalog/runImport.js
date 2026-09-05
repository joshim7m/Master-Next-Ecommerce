import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { mkdir, copyFile, writeFile } from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse';
import ExcelJS from 'exceljs';
import AdmZip from 'adm-zip';
import prisma from '@/src/lib/prisma';
import { CHUNK_SIZE, VALID_PRODUCT_STATUSES } from './constants';
import { sanitizeFilename, isRemotePath, fetchRemoteImage } from './images';

export async function importCatalogFile(filePath, originalName, workDir) {
  const extension = path.extname(originalName).toLowerCase();

  if (extension === '.zip') {
    const extractedDir = path.join(workDir, 'extracted');
    await mkdir(extractedDir, { recursive: true });
    extractZipGuarded(filePath, extractedDir);

    const productFile = path.join(extractedDir, 'products.csv');
    if (!existsSync(productFile)) {
      throw new Error('products.csv not found in the uploaded archive.');
    }

    return importProducts(productFile, extractedDir);
  }

  const fileType = await detectFileType(filePath, extension);

  if (fileType === 'categories') {
    return importCategories(filePath, extension);
  }
  return importProducts(filePath, '');
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

  if (headerKeys.includes('title') || headerKeys.includes('sku')) return 'products';
  if (headerKeys.includes('name')) return 'categories';

  throw new Error(
    'Could not detect whether the file contains products or categories. Expected a "Title"/"SKU" header for products or a "Name" header for categories.'
  );
}

async function* rowStream(filePath, extension) {
  let batch = [];

  if (extension === '.xlsx') {
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
    let r = 1;

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

async function importProducts(filePath, extractedDir) {
  const extension = path.extname(filePath).toLowerCase();
  const existingSkus = new Set(
    (
      await prisma.product.findMany({
        select: { sku: true },
      })
    )
      .map((p) => p.sku?.trim())
      .filter(Boolean)
  );
  const seenSlugs = new Set((await prisma.product.findMany({ select: { slug: true } })).map((p) => p.slug));
  const errors = [];

  let imported = 0;
  let skipped = 0;

  for await (const batch of rowStream(filePath, extension)) {
    for (const { row, rowNumber } of batch) {
      const sku = clean(row.sku);

      if (sku && existingSkus.has(sku)) {
        skipped++;
        continue;
      }

      const title = clean(row.title);
      const unitPrice = priceOf(row.unit_price);

      if (!title) {
        errors.push({ row: rowNumber, message: 'Title is required.' });
        skipped++;
        continue;
      }
      if (unitPrice === null) {
        errors.push({ row: rowNumber, message: 'Unit price is required.' });
        skipped++;
        continue;
      }

      const status = (clean(row.status) || 'draft').toLowerCase();
      if (!VALID_PRODUCT_STATUSES.includes(status)) {
        errors.push({ row: rowNumber, message: `Invalid status "${status}". Allowed: ${VALID_PRODUCT_STATUSES.join(', ')}.` });
        skipped++;
        continue;
      }

      const slug = uniqueSlug(clean(row.slug) || slugify(title), seenSlugs);

      const quantityRaw = parseInt(clean(row.quantity), 10);

      const product = await prisma.product.create({
        data: {
          title,
          slug,
          sku: sku || null,
          description: clean(row.description),
          metaDescription: clean(row.meta_description),
          tags: clean(row.tags),
          unite_price: unitPrice,
          sale_price: priceOf(row.sale_price),
          quantity: Number.isFinite(quantityRaw) ? Math.max(0, quantityRaw) : null,
          status,
        },
      });

      const categoryIds = [];
      for (const name of splitList(row.categories)) {
        const categorySlug = slugify(name);
        const category = await prisma.category.upsert({
          where: { slug: categorySlug },
          update: {},
          create: { name, slug: categorySlug },
        });
        categoryIds.push({ id: category.id });
      }
      if (categoryIds.length) {
        await prisma.product.update({
          where: { id: product.id },
          data: { categories: { set: categoryIds } },
        });
      }

      if (sku) existingSkus.add(sku);
      seenSlugs.add(slug);

      await importProductImages(product, extractedDir, row.images, rowNumber, errors);
      imported++;
    }
  }

  return { imported, skipped, errors };
}

async function importCategories(filePath, extension) {
  const seenSlugs = new Set((await prisma.category.findMany({ select: { slug: true } })).map((c) => c.slug));
  const errors = [];

  let imported = 0;
  let skipped = 0;

  for await (const batch of rowStream(filePath, extension)) {
    for (const { row, rowNumber } of batch) {
      const name = clean(row.name);

      if (!name) {
        errors.push({ row: rowNumber, message: 'Name is required.' });
        skipped++;
        continue;
      }

      const slug = uniqueSlug(clean(row.slug) || slugify(name), seenSlugs);

      if (seenSlugs.has(slug)) {
        skipped++;
        continue;
      }

      seenSlugs.add(slug);

      const parentName = clean(row.parent);
      let parentId = null;
      if (parentName) {
        const parentSlug = slugify(parentName);
        const parent = await prisma.category.upsert({
          where: { slug: parentSlug },
          update: {},
          create: { name: parentName, slug: parentSlug },
        });
        parentId = parent.id;
      }

      await prisma.category.create({
        data: {
          name,
          slug,
          parentId,
          description: clean(row.description),
        },
      });

      imported++;
    }
  }

  return { imported, skipped, errors };
}

async function importProductImages(product, extractedDir, imagesColumn, rowNumber, errors) {
  let index = 0;

  for (const name of splitList(imagesColumn)) {
    const source = locateImage(extractedDir, name);

    if (!source) {
      errors.push({ row: rowNumber, message: `Image "${name}" not found.` });
      index++;
      continue;
    }

    const ext = path.extname(sanitizeFilename(name)) || '.jpg';
    const filename = `${product.id}-${index}${ext}`;
    const target = path.join(process.cwd(), 'public', 'uploads', 'products', filename);

    try {
      await mkdir(path.dirname(target), { recursive: true });

      if (source.remote) {
        const buffer = await fetchRemoteImage(source.url);
        if (!buffer) {
          errors.push({ row: rowNumber, message: `Image "${name}" could not be downloaded.` });
          index++;
          continue;
        }
        await writeFile(target, buffer);
      } else {
        await copyFile(source.path, target);
      }

      await prisma.productImage.create({
        data: { productId: product.id, image_path: `/uploads/products/${filename}` },
      });
    } catch {
      errors.push({ row: rowNumber, message: `Image "${name}" could not be saved.` });
    }

    index++;
  }
}

function locateImage(extractedDir, name) {
  const basename = path.basename(name);

  if (extractedDir) {
    const inArchive = path.join(extractedDir, 'images', basename);
    if (existsSync(inArchive)) return { path: inArchive };
  }

  const publicPath = path.join(process.cwd(), 'public', name);
  if (!publicPath.includes('..') && existsSync(publicPath)) return { path: publicPath };

  if (isRemotePath(name)) return { remote: true, url: name };

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
    if (!target.startsWith(resolvedTarget + path.sep) && target !== resolvedTarget) continue;

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

function splitList(value) {
  const v = clean(value);
  if (!v) return [];
  return [...new Set(v.split(/[,;|]/).map((s) => s.trim()).filter(Boolean))];
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
  while (seen.has(slug)) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

function normalizeKey(name) {
  return String(name)
    .replace(/^\xEF\xBB\xBF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
