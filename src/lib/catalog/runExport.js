import { createWriteStream } from 'fs';
import { mkdir, rm, copyFile, writeFile } from 'fs/promises';
import path from 'path';
import { stringify } from 'csv-stringify';
import { ZipArchive } from 'archiver';
import prisma from '@/src/lib/prisma';
import { CHUNK_SIZE, PRODUCT_COLUMNS } from './constants';
import { exportWorkDir } from './paths';
import { sanitizeFilename, isRemotePath, fetchRemoteImage } from './images';

export async function buildCatalogZip() {
  const workRoot = exportWorkDir();
  const buildDir = path.join(workRoot, 'build');
  const imageDir = path.join(buildDir, 'images');
  const csvPath = path.join(buildDir, 'products.csv');
  const zipPath = path.join(workRoot, 'catalog-export.zip');

  await mkdir(imageDir, { recursive: true });

  try {
    let processed = 0;
    let cursor;

    const csvStream = stringify();
    const fileStream = createWriteStream(csvPath);
    fileStream.write('\xEF\xBB\xBF');
    csvStream.write(PRODUCT_COLUMNS);
    csvStream.pipe(fileStream);

    while (true) {
      const products = await prisma.product.findMany({
        include: { categories: true, images: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: CHUNK_SIZE,
        ...(cursor ? { skip: 1, cursor } : {}),
      });

      if (products.length === 0) break;
      cursor = { createdAt: products[products.length - 1].createdAt, id: products[products.length - 1].id };

      for (const product of products) {
        const imageNames = [];

        for (const [i, image] of product.images.entries()) {
          const name = await exportImage(imageDir, product.id, i, image.image_path);
          if (name) imageNames.push(name);
        }

        csvStream.write([
          product.title,
          product.slug,
          product.sku,
          product.description,
          product.metaDescription,
          product.tags,
          product.unite_price != null ? String(product.unite_price) : '',
          product.sale_price != null ? String(product.sale_price) : '',
          product.quantity ?? '',
          product.status,
          product.categories.map((c) => c.name).join(', '),
          imageNames.join(','),
        ]);
      }

      processed += products.length;
    }

    csvStream.end();
    await new Promise((resolve, reject) => {
      fileStream.on('close', resolve);
      fileStream.on('error', reject);
    });

    await buildZip(buildDir, zipPath);

    return { workDir: workRoot, zipPath, count: processed };
  } catch (error) {
    await rm(workRoot, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

async function exportImage(imageDir, productId, index, imagePath) {
  if (!imagePath) return null;

  const filename = `${productId}-${index}-${sanitizeFilename(imagePath)}`;
  const target = path.join(imageDir, filename);

  try {
    if (isRemotePath(imagePath)) {
      const buffer = await fetchRemoteImage(imagePath);
      if (!buffer) return null;
      await writeFile(target, buffer);
    } else {
      const localPath = path.join(process.cwd(), 'public', imagePath);
      await copyFile(localPath, target);
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
