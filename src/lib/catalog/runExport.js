import { createWriteStream } from 'fs';
import { mkdir, rm, copyFile, writeFile } from 'fs/promises';
import path from 'path';
import { stringify } from 'csv-stringify';
import { ZipArchive } from 'archiver';
import prisma from '@/src/lib/prisma';
import {
  CHUNK_SIZE,
  PRODUCT_COLUMNS,
  CATEGORY_COLUMNS,
  OPTION_COLUMNS,
  VARIANT_COLUMNS,
  UPSELL_COLUMNS,
  IMAGE_FOLDERS,
} from './constants';
import { exportWorkDir } from './paths';
import { sanitizeFilename, resolveStoredImage, fetchRemoteImage } from './images';

const BOM = '\xEF\xBB\xBF';

export async function buildCatalogZip() {
  const workRoot = exportWorkDir();
  const buildDir = path.join(workRoot, 'build');
  const imageDir = path.join(buildDir, 'images');
  const zipPath = path.join(workRoot, 'catalog-export.zip');

  await mkdir(path.join(imageDir, IMAGE_FOLDERS.products), { recursive: true });
  await mkdir(path.join(imageDir, IMAGE_FOLDERS.categories), { recursive: true });

  try {
    // Small, bounded entities — read in one pass each. Only products paginate.
    let missingImages = await writeCategoryCsv(buildDir, imageDir);
    await writeOptionsCsv(buildDir);
    await writeUpsellsCsv(buildDir);

    // Variants come last because a variant's `Image` cell has to name one of the
    // files products.csv just wrote, so it needs the product pass to have run.
    const productPass = await writeProductCsv(buildDir, imageDir);
    missingImages += productPass.missingImages;

    await writeVariantsCsv(buildDir, productPass.imageFilenameById);

    await buildZip(buildDir, zipPath);

    return { workDir: workRoot, zipPath, count: productPass.count, missingImages };
  } catch (error) {
    await rm(workRoot, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

/* ------------------------------------------------------------------ categories */

async function writeCategoryCsv(buildDir, imageDir) {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: { name: true, slug: true, parent: { select: { slug: true } }, description: true, image: true },
  });

  const targetDir = path.join(imageDir, IMAGE_FOLDERS.categories);
  const rows = [];
  let missingImages = 0;

  for (const category of categories) {
    const imageName = await exportImage(targetDir, category.slug, null, category.image);
    if (!imageName && category.image) missingImages++;

    rows.push([
      category.name,
      category.slug,
      category.parent?.slug ?? '',
      category.description ?? '',
      imageName ?? '',
    ]);
  }

  await writeCsvFile(path.join(buildDir, 'categories.csv'), CATEGORY_COLUMNS, rows);
  return missingImages;
}

/* --------------------------------------------------------------------- options */

async function writeOptionsCsv(buildDir) {
  const options = await prisma.productOption.findMany({
    orderBy: [{ productId: 'asc' }, { position: 'asc' }],
    select: { name: true, position: true, product: { select: { slug: true } } },
  });

  await writeCsvFile(
    path.join(buildDir, 'options.csv'),
    OPTION_COLUMNS,
    options.map((o) => [o.product.slug, o.name, o.position])
  );
}

/* --------------------------------------------------------------------- upsells */

async function writeUpsellsCsv(buildDir) {
  const upsells = await prisma.productUpsell.findMany({
    orderBy: [{ productId: 'asc' }, { sortOrder: 'asc' }],
    select: {
      sortOrder: true,
      product: { select: { slug: true } },
      upsell: { select: { slug: true } },
    },
  });

  await writeCsvFile(
    path.join(buildDir, 'upsells.csv'),
    UPSELL_COLUMNS,
    upsells.map((u) => [u.product.slug, u.upsell.slug, u.sortOrder])
  );
}

/* -------------------------------------------------------------------- products */

async function writeProductCsv(buildDir, imageDir) {
  const csvPath = path.join(buildDir, 'products.csv');
  const targetDir = path.join(imageDir, IMAGE_FOLDERS.products);

  let processed = 0;
  let missingImages = 0;
  let cursor;

  // ProductImage.id -> the archive filename it was written under. Handed to the
  // variants pass so a variant can name one of its product's own files instead of
  // duplicating the bytes under a second name.
  const imageFilenameById = new Map();

  const csvStream = stringify();
  const fileStream = createWriteStream(csvPath);
  fileStream.write(BOM);
  csvStream.write(PRODUCT_COLUMNS);
  csvStream.pipe(fileStream);

  while (true) {
    const products = await prisma.product.findMany({
      include: {
        categories: { select: { name: true, slug: true } },
        images: { select: { id: true, image_path: true, altText: true } },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: CHUNK_SIZE,
      ...(cursor ? { skip: 1, cursor } : {}),
    });

    if (products.length === 0) break;
    cursor = { createdAt: products[products.length - 1].createdAt, id: products[products.length - 1].id };

    for (const product of products) {
      const imageNames = [];
      const altTexts = [];

      for (const [index, image] of product.images.entries()) {
        const name = await exportImage(targetDir, product.slug, index, image.image_path);
        if (!name) {
          if (image.image_path) missingImages++;
          continue;
        }
        imageNames.push(name);
        altTexts.push(image.altText ?? '');
        imageFilenameById.set(image.id, name);
      }

      csvStream.write([
        product.title,
        product.slug,
        product.sku ?? '',
        product.description ?? '',
        product.specification ?? '',
        product.metaDescription ?? '',
        product.tags ?? '',
        product.unite_price != null ? String(product.unite_price) : '',
        product.sale_price != null ? String(product.sale_price) : '',
        product.quantity ?? '',
        product.status,
        product.featured ? 'true' : 'false',
        product.videoUrl ?? '',
        product.categories.map((c) => c.name).join(', '),
        // Authoritative link key (docs §7.4); `Categories` stays for readability
        // and for archives predating this column.
        product.categories.map((c) => c.slug).join(', '),
        imageNames.join(','),
        altTexts.join(','),
      ]);
    }

    processed += products.length;
  }

  csvStream.end();
  await new Promise((resolve, reject) => {
    fileStream.on('close', resolve);
    fileStream.on('error', reject);
  });

  return { count: processed, missingImages, imageFilenameById };
}

/* -------------------------------------------------------------------- variants */

/**
 * A variant's `Image` cell references one of its parent product's files rather
 * than repeating the bytes, so the archive holds a single copy of each image and
 * the import can connect the variant to a real `ProductImage` row.
 *
 * `options` is written as the JSON array exactly as stored, so import never has
 * to reason about positional alignment against `options.csv`.
 */
async function writeVariantsCsv(buildDir, imageFilenameById) {
  const variants = await prisma.productVariant.findMany({
    orderBy: [{ productId: 'asc' }, { id: 'asc' }],
    select: {
      sku: true,
      options: true,
      unite_price: true,
      sale_price: true,
      quantity: true,
      isDefault: true,
      imageId: true,
      product: { select: { slug: true } },
    },
  });

  await writeCsvFile(
    path.join(buildDir, 'variants.csv'),
    VARIANT_COLUMNS,
    variants.map((v) => [
      v.product.slug,
      v.sku ?? '',
      JSON.stringify(Array.isArray(v.options) ? v.options : []),
      v.unite_price != null ? String(v.unite_price) : '',
      v.sale_price != null ? String(v.sale_price) : '',
      v.quantity,
      v.isDefault ? 'true' : 'false',
      v.imageId ? imageFilenameById.get(v.imageId) ?? '' : '',
    ])
  );
}

/* ---------------------------------------------------------------------- shared */

async function writeCsvFile(csvPath, columns, rows) {
  const fileStream = createWriteStream(csvPath);
  fileStream.write(BOM);

  const csvStream = stringify();
  csvStream.write(columns);
  for (const row of rows) csvStream.write(row);
  csvStream.end();

  csvStream.pipe(fileStream);

  await new Promise((resolve, reject) => {
    fileStream.on('close', resolve);
    fileStream.on('error', reject);
  });
}

/**
 * Copy one stored image into `targetDir` and return its archive filename.
 *
 * The prefix is the entity's slug rather than its UUID: a UUID is unique within a
 * single database and meaningless on the machine the archive is imported into.
 * `index` is the display order for products (which can have several) and null for
 * categories (which have at most one).
 *
 * Returns null when the image cannot be resolved or copied — never fatal, but the
 * caller counts it so a truncated export is visible rather than silent.
 */
async function exportImage(targetDir, prefix, index, imagePath) {
  const source = resolveStoredImage(imagePath);
  if (!source) return null;

  const basename = sanitizeFilename(imagePath);
  const filename = index === null ? `${prefix}-${basename}` : `${prefix}-${index}-${basename}`;
  const target = path.join(targetDir, filename);

  try {
    if (source.kind === 'remote') {
      const buffer = await fetchRemoteImage(source.url);
      if (!buffer) return null;
      await writeFile(target, buffer);
    } else {
      await copyFile(source.path, target);
    }
    return filename;
  } catch {
    return null;
  }
}

function buildZip(directory, zipPath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = new ZipArchive();

    output.on('close', resolve);
    archive.on('error', reject);
    output.on('error', reject);
    archive.pipe(output);
    archive.directory(directory, false);
    archive.finalize();
  });
}