# Catalog Import / Export — Portable Implementation Guide

A synchronous, chunked import/export system for the product catalog, built on Next.js route handlers + Prisma + ExcelJS/Archiver. Shopify-style: **one** catalog file (`products.csv`) carries every product **and** its categories (as name columns), delivered as a **ZIP archive containing the single CSV + real image files** (never image URLs).

This guide is written so you can re-implement the feature in *any* Next.js app backed by PostgreSQL. Where the code touches the schema, adapt the field names listed in §2.2. The planned reference layout lives in this repository (`src/lib/catalog/*`, `app/api/admin/catalog/*`, `app/admin/settings/catalog-import-export/page.jsx`).

---

## 1. Overview

| Capability | Detail |
|---|---|
| **What it exports/imports** | Products, with their categories embedded in each product row |
| **File format** | **One** CSV — `products.csv` — one row per product; categories are a `Categories` name column (Shopify-style), never a second file |
| **Export deliverable** | `catalog-export-{timestamp}.zip` = `products.csv` + `images/` folder, streamed straight from the request |
| **Import input** | ZIP (single `products.csv` + images), or a plain CSV / XLSX (products *or* categories, auto-detected from columns) |
| **Processing** | Inline within the API request, chunked in batches of **50 rows** |
| **Result delivery** | The HTTP response *is* the result — export returns the ZIP, import returns a JSON report `{ imported, skipped, errors[] }` |
| **Duplicate policy** | Rows with an existing SKU (products) or slug (categories) are **skipped and reported** |
| **Variants** | **Excluded** — scope is product-level fields only |

### Why chunked?

Rows are processed in chunks of 50, keeping memory usage flat regardless of catalog size: exports paginate with a Prisma cursor and stream the CSV/ZIP to disk; imports stream-parse the CSV and write in batches. Total time still scales with catalog size, but memory never does.

### Why synchronous instead of queued?

This project runs on a **VPS / Docker** where we control the reverse proxy, so there is no need for job tables, a worker process, or progress polling. The admin clicks a button and waits; the browser shows a loading state; the response carries the finished result. This removes an entire class of infrastructure (queue tables, worker supervision, stale-job recovery, status endpoints).

**Trade-off:** the whole operation must finish within one HTTP request. Chunking keeps memory flat, but total duration is bounded by the proxy timeout (§10). For this project's catalog size that is comfortably fine; if the catalog ever grows past what fits in a few minutes, the chunked functions in §6–7 are deliberately structured so a queue/worker can be wrapped around them later without rewriting the core logic.

### Why ZIP instead of a single spreadsheet?

CSV cannot embed binary image files. A ZIP archive carries the CSV **and** a folder of image files, with the CSV referencing images by filename. XLSX cannot carry extracted image files either, so CSV + ZIP is the only format that transfers real images.

---

## 2. Requirements & Assumed Schema

### 2.1 Packages

```bash
npm install exceljs archiver csv-parse csv-stringify adm-zip
```

| Package | Role |
|---|---|
| `exceljs` | XLSX reading (plain uploads) |
| `archiver` | Streaming ZIP creation (flat memory during export) |
| `csv-stringify` | Streaming CSV writing (export) |
| `csv-parse` | Streaming CSV reading (import) |
| `adm-zip` | ZIP extraction (import). Loads the archive into memory — acceptable under the 200 MB upload cap |

No queue library needed.

### 2.2 Assumed table columns (this project's actual schema)

| Table | Columns used |
|---|---|
| `Product` | `id`, `title`, `slug` (unique), `sku` (unique), `description?`, `metaDescription?`, `tags?`, `unite_price` (Decimal), `sale_price` (Decimal?, **optional**), `quantity` (Int?), `status` (`publish` \| `draft`), timestamps |
| `Category` | `id`, `name`, `slug` (unique), `parentId?`, M2M `products` via implicit join table `"ProductCategories"` |
| `ProductImage` | `id`, `productId` FK, `image_path`, `altText?` |

Schema notes that differ from common Laravel-style references:

| Reference convention | This project |
|---|---|
| `unit_price` int, `sale_price` required | `unite_price` Decimal, `sale_price` **nullable/optional** |
| `status` active/inactive/draft | `publish` / `draft` |
| Primary `category_id` + pivot | M2M only → single `Categories` name column |
| `featured`, `specification` | not in schema → dropped; `metaDescription`, `tags` added |
| Eloquent `chunkById(100)` | Prisma cursor pagination (`findMany({ cursor, take: 50 })`) |
| ZipArchive / PhpSpreadsheet | `archiver` / `exceljs` |

Prices are stored as **Decimal**. The importer cleans currency symbols/whitespace before handing values to Prisma.

---

## 3. Module Layout

```
src/lib/catalog/
├── constants.js      # chunk size, CSV column headers
├── paths.js          # temp work-dir resolution under os.tmpdir()
├── csv.js            # header row, BOM, row ↔ object mapping
├── images.js         # sanitizeFilename, locateImage, fetchRemoteImage
├── runExport.js      # buildCatalogZip() → { zipPath, count }
└── runImport.js      # importCatalogFile(filePath, originalName) → report
app/api/admin/catalog/
├── export/route.js               GET  — build ZIP, stream it back
└── import/route.js               POST — accept upload, process, return report
app/admin/settings/catalog-import-export/page.jsx
```

`constants.js`:

```js
export const CHUNK_SIZE = 50;

export const PRODUCT_COLUMNS = [
  'Title', 'Slug', 'SKU', 'Description', 'Meta Description', 'Tags',
  'Unit Price', 'Sale Price', 'Quantity', 'Status', 'Categories', 'Images',
];
```

`paths.js` — everything runs out of the OS temp dir and is cleaned up after each request:

```js
import { tmpdir } from 'os';
import path from 'path';

export const exportWorkDir = () => path.join(tmpdir(), `catalog-export-${Date.now()}`);
export const importWorkDir = () => path.join(tmpdir(), `catalog-import-${Date.now()}`);
```

---

## 4. API Routes

All routes live under `/api/admin/*`, which is already JWT-guarded by `proxy.js` (matcher `/admin/:path*`). Each handler also performs the same inline token check used by the backup route (defense in depth).

| Method | URI | Purpose |
|---|---|---|
| GET | `/api/admin/catalog/export` | Builds the ZIP (chunked, inline) and responds with the file download |
| POST | `/api/admin/catalog/import` | multipart `{ file }` (.zip/.csv/.xlsx ≤ 200 MB) → processes inline → JSON report |

There are no job records, no status endpoint, and no separate download endpoint — the request/response cycle covers everything.

---

## 5. Route Handlers

### Shared auth helper

```js
// src/lib/catalog/auth.js
import { verifyToken, getTokenFromCookies } from '@/src/lib/auth-edge';

export async function requireAdmin(request) {
  const token = getTokenFromCookies(request);
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.role === 'admin' ? payload : null;
}
```

### `GET /api/admin/catalog/export/route.js`

```js
import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat, rm } from 'fs/promises';
import { Readable } from 'stream';
import { requireAdmin } from '@/src/lib/catalog/auth';
import { buildCatalogZip } from '@/src/lib/catalog/runExport';

export async function GET(request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { zipPath } = await buildCatalogZip(); // chunked build to a temp file

  try {
    await stat(zipPath);
    const nodeStream = createReadStream(zipPath);

    // Stream the response; clean up the temp dir once the stream closes.
    nodeStream.on('close', () => rm(path.dirname(zipPath), { recursive: true, force: true }).catch(() => {}));

    return new Response(Readable.toWeb(nodeStream), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="catalog-export-${Date.now()}.zip"`,
      },
    });
  } catch (error) {
    await rm(path.dirname(zipPath), { recursive: true, force: true }).catch(() => {});
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}
```

### `POST /api/admin/catalog/import/route.js`

```js
import { NextResponse } from 'next/server';
import { writeFile, rm } from 'fs/promises';
import path from 'path';
import { requireAdmin } from '@/src/lib/catalog/auth';
import { importCatalogFile } from '@/src/lib/catalog/runImport';
import { importWorkDir } from '@/src/lib/catalog/paths';

const MAX_BYTES = 200 * 1024 * 1024;
const ALLOWED = ['.zip', '.csv', '.xlsx'];

export async function POST(request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const originalName = file.name || 'catalog.csv';
  const ext = path.extname(originalName).toLowerCase();

  if (!ALLOWED.includes(ext)) {
    return NextResponse.json({ error: 'Only .zip, .csv, .xlsx files are supported' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds the 200 MB limit' }, { status: 413 });
  }

  const workDir = importWorkDir();
  await mkdir(workDir, { recursive: true });

  try {
    const storedPath = path.join(workDir, originalName);
    await writeFile(storedPath, buffer);

    const report = await importCatalogFile(storedPath, originalName, workDir);

    return NextResponse.json({ success: true, ...report });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Import failed' }, { status: 500 });
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
```

> If the client sends a body larger than the server's limit, the platform rejects the request before this handler runs — see §8 for the nginx configuration that keeps the error friendly.

---

## 6. Export Logic — `buildCatalogZip()` in `src/lib/catalog/runExport.js`

Key points:
- Chunked with Prisma **cursor pagination** (batches of 50) so memory stays flat.
- CSV is written as a stream (`csv-stringify` piped to disk) prefixed with a UTF-8 BOM (`\xEF\xBB\xBF`).
- Images are copied/downloaded into `images/` as `{productId}-{index}-{basename}`.
- Work dir lives in the OS temp dir and is removed after the ZIP is streamed.

```js
import { createWriteStream } from 'fs';
import { mkdir, rm, copyFile, writeFile } from 'fs/promises';
import path from 'path';
import { stringify } from 'csv-stringify';
import archiver from 'archiver';
import { prisma } from '@/src/lib/prisma';
import { CHUNK_SIZE, PRODUCT_COLUMNS } from './constants';
import { exportWorkDir } from './paths';
import { sanitizeFilename, fetchRemoteImage } from './images';

export async function buildCatalogZip() {
  const workDir = exportWorkDir();
  const imageDir = path.join(workDir, 'images');
  const csvPath = path.join(workDir, 'products.csv');
  const zipPath = path.join(workDir, 'catalog-export.zip');

  await mkdir(imageDir, { recursive: true });

  let processed = 0;
  let cursor; // undefined = first page

  const csvStream = stringify();
  const fileStream = createWriteStream(csvPath);
  fileStream.write('\xEF\xBB\xBF'); // UTF-8 BOM so Excel renders Bengali correctly
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
    cursor = { createdAt: products.at(-1).createdAt, id: products.at(-1).id };

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
        product.unite_price?.toString(),
        product.sale_price?.toString(),
        product.quantity ?? '',
        product.status,
        product.categories.map((c) => c.name).join(', '),
        imageNames.join(','),
      ]);
    }

    processed += products.length;
  }

  csvStream.end();
  await new Promise((resolve, reject) => fileStream.on('close', resolve).on('error', reject));

  await buildZip(workDir, zipPath);
  await rm(csvPath, { force: true });
  await rm(imageDir, { recursive: true, force: true });

  return { zipPath, count: processed };
}

async function exportImage(imageDir, productId, index, imagePath) {
  if (!imagePath) return null;

  const filename = `${productId}-${index}-${sanitizeFilename(imagePath)}`;
  const target = path.join(imageDir, filename);

  try {
    if (/^https?:\/\//.test(imagePath)) {
      const buffer = await fetchRemoteImage(imagePath); // timeout + size guard inside
      if (!buffer) return null;
      await writeFile(target, buffer);
    } else {
      // local uploads live under public/uploads/...
      await copyFile(path.join(process.cwd(), 'public', imagePath), target);
    }
    return filename;
  } catch {
    return null; // missing/unreachable image: skipped silently, never fatal
  }
}

async function buildZip(directory, zipPath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip');

    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(directory, false);
    archive.finalize();
  });
}
```

### ZIP structure

```
catalog-export-{timestamp}.zip
├── products.csv             one row per product (categories + images as columns)
└── images/
    ├── 12-0-white-shirt.jpg      {productId}-{index}-{basename}
    ├── 12-1-white-shirt-back.jpg
    └── ...
```

There is **no** `categories.csv` — like Shopify, everything lives in one file.

### `products.csv` columns

Headers, in order, prefixed with a UTF-8 BOM (`\xEF\xBB\xBF`) so Excel renders non-ASCII text correctly:

```
Title, Slug, SKU, Description, Meta Description, Tags, Unit Price, Sale Price, Quantity, Status, Categories, Images
```

| Column | Notes |
|---|---|
| `Title` | Product title (**required** on import) |
| `Slug` | Auto-generated on import if blank |
| `SKU` | Dedupe key on import |
| `Description` / `Meta Description` / `Tags` | Plain text |
| `Unit Price` | Decimal, **required** on import |
| `Sale Price` | Decimal, optional (nullable in schema) |
| `Quantity` | Stock quantity (base, non-variant stock) |
| `Status` | `publish` \| `draft` (default `draft`) |
| `Categories` | Comma-separated category **names** — like Shopify's *Tags*. Auto-created on import |
| `Images` | Comma-separated image filenames as written under `images/` |

> Categories are represented **by name only** (Shopify-faithful). On import they are auto-created via `upsert` on slugified name; category metadata (description, parent, image) is not part of this format.

### Image handling on export

- Images are written ordered by their insertion order (`ProductImage` rows).
- **Local paths** (stored under `public/uploads/...`) are copied directly into `images/`.
- **Remote URLs** (seeded data) are downloaded at export time via `fetch` with a timeout; failed downloads are skipped silently.
- Filename scheme `{productId}-{index}-{basename}` guarantees uniqueness and restores ordering on import.

---

## 7. Import Logic — `importCatalogFile()` in `src/lib/catalog/runImport.js`

Key points:
- ZIP → guarded extraction → requires `products.csv` at root.
- Standalone CSV/XLSX → type auto-detected from headers (`Title`/`SKU` → products; `Name` → categories).
- Dedupes against existing SKUs/slugs **and** within the file (per-run `Set`s).
- CSV is streamed with `csv-parse`; XLSX uses ExcelJS row iteration (see memory note below).
- Images resolve from the extracted `images/`, a local `public/` path, or a remote URL; missing images are row errors, never fatal.
- Returns `{ imported, skipped, errors }` — the route handler sends it straight to the browser.

```js
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

  const fileType = await detectFileType(filePath);

  if (fileType === 'categories') {
    return importCategories(filePath);
  }
  return importProducts(filePath, '');
}
```

### Product import core

```js
async function importProducts(filePath, extractedDir) {
  const existingSkus = new Set(
    (await prisma.product.findMany({ where: { sku: { not: null } }, select: { sku: true } }))
      .map((p) => p.sku.trim())
  );
  const seenSlugs = new Set((await prisma.product.findMany({ select: { slug: true } })).map((p) => p.slug));
  const errors = [];

  let imported = 0;
  let skipped = 0;

  for await (const { row, rowNumber } of rowStream(filePath)) {
    const sku = clean(row.sku);

    if (sku && existingSkus.has(sku)) { skipped++; continue; }        // duplicate policy

    const title = clean(row.title);
    const unitPrice = priceOf(row.unit_price);
    if (!title) { errors.push({ row: rowNumber, message: 'Title is required.' }); skipped++; continue; }
    if (unitPrice === null) { errors.push({ row: rowNumber, message: 'Unit price is required.' }); skipped++; continue; }

    const status = (clean(row.status) || 'draft').toLowerCase();
    if (!['publish', 'draft'].includes(status)) {
      errors.push({ row: rowNumber, message: `Invalid status "${status}".` }); skipped++; continue;
    }

    const slug = uniqueSlug(clean(row.slug) || slugify(title), seenSlugs);

    const product = await prisma.product.create({
      data: {
        title,
        slug,
        sku: sku || null,
        description: clean(row.description),
        metaDescription: clean(row.meta_description),
        tags: clean(row.tags),
        unite_price: unitPrice,
        sale_price: priceOf(row.sale_price),            // optional in this schema
        quantity: Number.isFinite(parseInt(row.quantity, 10)) ? Math.max(0, parseInt(row.quantity, 10)) : null,
        status,
      },
    });

    // resolve/auto-create categories by name, then link
    const categoryIds = [];
    for (const name of splitList(row.categories)) {
      const category = await prisma.category.upsert({
        where: { slug: slugify(name) },
        update: {},
        create: { name, slug: slugify(name) },
      });
      categoryIds.push({ id: category.id });
    }
    if (categoryIds.length) {
      await prisma.product.update({ where: { id: product.id }, data: { categories: { set: categoryIds } } });
    }

    if (sku) existingSkus.add(sku);
    seenSlugs.add(slug);

    await importProductImages(product, extractedDir, row.images, rowNumber, errors);
    imported++;
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

    const ext = path.extname(name);
    const target = path.join(process.cwd(), 'public', 'uploads', 'products', `${product.id}-${index}${ext}`);
    await mkdir(path.dirname(target), { recursive: true });

    if (source.remote) {
      const buffer = await fetchRemoteImage(source.url);
      if (!buffer) { errors.push({ row: rowNumber, message: `Image "${name}" could not be downloaded.` }); index++; continue; }
      await writeFile(target, buffer);
    } else {
      await copyFile(source.path, target);
    }

    await prisma.productImage.create({
      data: { productId: product.id, image_path: `/uploads/products/${product.id}-${index}${ext}` },
    });
    index++;
  }
}
```

### Row streaming (chunks of 50)

```js
async function* rowStream(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let batch = [];
  let batchStartRow = 0;

  const flush = function* () {
    yield { rows: batch, rowNumber: batchStartRow }; // caller iterates rows internally
    batch = [];
  };

  if (ext === '.xlsx') {
    // Memory note: ExcelJS loads the whole sheet. Fine for typical catalogs (<~50k rows).
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.worksheets[0];
    const header = {};
    sheet.getRow(1).eachCell((cell, col) => { header[normalizeKey(String(cell.value))] = col; });

    for (let r = 2; r <= sheet.rowCount; r++) {
      const cells = sheet.getRow(r).values;
      const row = {};
      for (const [key, col] of Object.entries(header)) row[key] = cells[col] ?? null;
      if (batch.length === 0) batchStartRow = r;
      batch.push({ row, rowNumber: r });
      if (batch.length >= CHUNK_SIZE) yield* flush();
    }
  } else {
    const parser = parse({ bom: true, trim: true });
    createReadStream(filePath).pipe(parser);

    let headerKeys = null;
    let r = 1;

    for await (const values of parser) {
      r++;
      if (!headerKeys) { headerKeys = values.map(normalizeKey); continue; }
      const row = {};
      headerKeys.forEach((key, i) => { if (key) row[key] = values[i] ?? null; });
      if (batch.length === 0) batchStartRow = r;
      batch.push({ row, rowNumber: r });
      if (batch.length >= CHUNK_SIZE) yield* flush();
    }
  }

  if (batch.length) yield* flush();
}
```

> **ExcelJS gotcha:** `getRow().values` is 1-indexed and element `0` is always empty — always map through header column numbers, never assume offsets.

### Image resolution order (import)

1. `workDir/extracted/images/{basename}` — from the uploaded ZIP
2. `public/{path}` — an existing local upload path
3. Remote URL — downloaded into `public/uploads/products/{productId}-{index}{ext}`

Missing images produce a row error (`Image "x.jpg" not found.`) but never abort the import.

### Guarded ZIP extraction

```js
function extractZipGuarded(zipPath, extractTo) {
  const zip = new AdmZip(zipPath);
  const resolvedTarget = path.resolve(extractTo);

  for (const entry of zip.getEntries()) {
    const name = entry.entryName.replace(/\\/g, '/');

    if (name.includes('..') || path.isAbsolute(name) || /^[A-Za-z]:\//.test(name)) continue; // traversal guard
    if (entry.isDirectory) continue;

    const target = path.resolve(extractTo, name);
    if (!target.startsWith(resolvedTarget)) continue;                                        // containment check

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, entry.getData());
  }
}
```

### Type auto-detection (standalone files)

Read the first row of headers:

- contains `title` or `sku` → **products**
- contains `name` → **categories** (columns: `Name`, `Slug?`, `Parent?`, `Description?`)
- otherwise → fail with a clear message

Category import mirrors products: dedupe by slug, `Parent` resolved by name, duplicates skipped. Returns the same `{ imported, skipped, errors }` shape.

### Helpers

```js
const clean = (v) => (v == null ? null : String(v).trim() || null);

function priceOf(value) {
  const v = clean(value);
  if (v == null) return null;
  const n = parseFloat(v.replace(/[^0-9.-]/g, ''));   // strips ৳, commas, spaces
  return Number.isFinite(n) ? n : null;               // Prisma Decimal accepts floats/strings
}

function splitList(value) {
  const v = clean(value);
  if (!v) return [];
  return [...new Set(v.split(/[,;|]/).map((s) => s.trim()).filter(Boolean))];
}

function slugify(text) {
  const base = text.toLowerCase().trim()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')         // keep Bengali letters
    .replace(/^-+|-+$/g, '');
  return base || `item-${Date.now()}`;                // Bengali-only titles survive; empty falls back
}

function uniqueSlug(base, seen) {
  let slug = base, suffix = 2;
  while (seen.has(slug)) slug = `${base}-${suffix++}`;
  return slug;
}

function normalizeKey(name) {
  return String(name).replace(/^\xEF\xBB\xBF/, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
}
```

---

## 8. Upload Size Handling

Route handlers receive the whole multipart body before your validation runs, so a too-large upload fails at the **reverse proxy**, not in code. On the VPS/nginx:

```nginx
# /etc/nginx/sites-available/your-app
client_max_body_size 210M;   # must exceed the app's 200 MB cap (multipart overhead)
client_body_timeout 300s;
proxy_read_timeout 300s;     # see §10 — exports/imports run inside one request
```

The handler's own `MAX_BYTES` check (§5) remains as defense in depth and returns a friendly `413` JSON when hit directly (e.g., local dev).

---

## 9. Frontend — `app/admin/settings/catalog-import-export/page.jsx`

Client component following the Backup DB page patterns. Two cards:

- **Export Catalog** card:
  - Button triggers `fetch('/api/admin/catalog/export')` → reads the response as a blob → parses the filename from `Content-Disposition` → triggers a browser download (same pattern as the Backup DB export).
  - While fetching: spinner/disabled state ("Building ZIP…"). Large catalogs can take a while — the button must stay disabled until the blob arrives.
  - Non-OK responses are parsed as JSON and shown as an error toast.
- **Import Catalog** card:
  - File input accepting `.zip,.csv,.xlsx`.
  - Submit → `FormData` POST with spinner ("Importing…").
  - On success, render the returned report inline: `imported` / `skipped` counts plus a toggleable list of row errors (`Row N: message`).
  - On failure, show the `error` message.

Wiring (same two-line changes made for Backup DB):

1. Add the page title to the title map in `app/admin/layout.jsx`.
2. Add a "Catalog I/O" entry to the Settings section in `app/admin/partials/AdminSidebar.jsx`.

There is no polling, no Recent Jobs table, and no status endpoint — nothing persists between requests.

---

## 10. Long Requests & Timeouts

Because processing happens inside one request, the reverse proxy must allow long-running responses:

```nginx
proxy_read_timeout 300s;    # raise if exports take longer (image downloads dominate)
proxy_send_timeout 300s;
```

Notes:

- Self-hosted `next start` has no execution time limit of its own — only nginx (or another proxy in front) cuts requests off.
- Export duration is dominated by **remote image downloads** (one `fetch` per seeded image). Local-upload-only catalogs export near-instantly.
- If the catalog ever outgrows comfortable request durations, the chunked functions (`buildCatalogZip`, `importProducts`) are structured so a queue/worker can wrap them later without rewriting the core logic — see the "queued" variant of this guide in git history.

---

## 11. Operations / Deployment

- **Nothing to supervise** — no worker process exists. Deploy as usual; the feature activates with the next build.
- **Temp files** — all working files live under `os.tmpdir()` and are deleted when the request finishes. No persistent storage volume is required.
- **Environment variables**: none beyond the existing `DATABASE_URL`.
- **nginx**: `client_max_body_size 210M` + `proxy_read_timeout 300s` (§8, §10).
- **Concurrent clicks**: two simultaneous exports/imports are safe — each gets its own timestamped temp dir; imports dedupe against live DB state, so worst case the second run reports the first run's products as "skipped".

---

## 12. Security

| Concern | Mitigation |
|---|---|
| Unauthorized access | Routes behind `proxy.js` JWT guard (`/admin/:path*` matcher) + inline token check per handler |
| Malicious ZIP (path traversal) | Reject entries containing `..`, absolute paths, or drive-letter prefixes; verify extraction target stays within the work dir |
| Image filename traversal | `sanitizeFilename()` (basename + character whitelist) before every copy |
| Upload size | 200 MB app cap + nginx `client_max_body_size` |
| Remote URL fetch (export & import) | `fetch` with timeout + response-size guard; failures skipped, never fatal |
| SQL injection | All access through Prisma parameterized queries |
| Temp file leakage | Work dirs under `os.tmpdir()`, removed in `finally` / on stream close |

---

## 13. Testing / Manual QA

No automated test framework is configured yet (see `docs/testing.md`). Manual QA checklist for this feature:

| Scenario | Expected |
|---|---|
| Export with local + remote images | ZIP contains `products.csv` + all reachable images; missing remote images silently absent |
| Bengali titles survive round-trip | BOM-prefixed CSV opens correctly in Excel; re-import preserves text |
| Import the exported ZIP | All products reported as `skipped` (SKUs exist) — no duplicates created |
| Import ZIP after deleting some products | Deleted ones recreated with images; rest skipped |
| Standalone products CSV | Auto-detected; categories auto-created and linked |
| Standalone categories CSV (`Name` header) | Only categories touched |
| Missing title / unit price row | Reported in `errors` with row number; other rows still imported |
| Invalid status value | Row error listing allowed values |
| Duplicate SKU within file | Second occurrence skipped |
| Non-.zip/.csv/.xlsx upload | 400 with clear message |
| >200 MB upload | 413 (from nginx or handler) |
| Cancel/refresh mid-import | Partial import possible (no transaction across whole file) — verify counts and re-import behavior |

Future Jest suite outline (when testing is introduced): round-trip identity, duplicate-skip policy, traversal-guard rejection, price/slug helper units.

---

## 14. Usage Walkthrough

### Export

1. Open **Admin → Settings → Catalog I/O**.
2. Click **Export Catalog** and wait (spinner shows progress state).
3. The browser downloads `catalog-export-{timestamp}.zip`.
4. Extract to see `products.csv` (one row per product, categories included as a column) and an `images/` folder.

### Import

1. On the same page, choose a **ZIP** (`products.csv` + images) or a plain **CSV/XLSX** (products or categories — detected from the columns).
2. Click import and wait.
3. Review the inline summary: imported, skipped (existing SKUs/slugs), and per-row errors.
4. Errors: fix the offending rows and re-upload; valid rows whose SKU now exists are skipped as duplicates, not re-created.

### Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Export request times out (504) | Too many remote images → raise `proxy_read_timeout` (§10) or reduce catalog size |
| Download never starts | Check browser network tab; non-OK responses return JSON errors instead of the ZIP |
| Some images missing from ZIP | Remote URL unreachable at export time (skipped silently) or local file missing |
| Import shows skipped for everything | SKUs already exist (expected) or header mismatch — verify column names match §6 spec |
| Single-file import fails to start | Headers lack `Title`/`SKU` (products) or `Name` (categories) |
| 413 on upload | nginx `client_max_body_size` below the file size — raise it (§8) |
| Bengali/UTF-8 garbled in Excel | File includes UTF-8 BOM; open with a BOM-aware tool or re-save as UTF-8 |
| Partial import after an error mid-file | Rows before the failure point were committed; fix the failing row and re-upload (existing SKUs skip automatically) |

---

## 15. FAQ / Edge Cases

- **Why is there no `categories.csv`?** Shopify-style: everything lives in one file. Categories are represented as a `Categories` **name column** on each product row and are auto-created on import.
- **What about category metadata (description, parent, image)?** Not part of the product format — categories are identified and created by name/slug only. If a category already exists, it's reused unchanged. (A standalone categories CSV with a `Name` header *does* support `Slug`, `Parent`, `Description`.)
- **Do variants get exported?** No — scope is product-level fields by decision. Variant data remains manageable through the admin product editor.
- **What happens to product images when a SKU is skipped?** Nothing — skipped rows never touch the database.
- **Can I import categories without products?** Yes — upload a CSV with a `Name` header; it's auto-detected and only categories are touched.
- **Can I export only a filtered set?** No — export always covers the full catalog.
- **Are remote (seeded) images handled?** Yes — they're downloaded into the ZIP at export time, so the ZIP contains real files, not URLs.
- **Large catalogs?** Cursor pagination + streaming CSV + streamed ZIP keep memory flat on export; chunked writes do the same on import. Duration is bounded by the request timeout (§10) — if that ever becomes a problem, reintroduce the queue variant (git history has it).
- **Import format XLSX?** Accepted, but cannot carry images (no ZIP). Use ZIP for image transfer.
- **Is the import atomic?** No — rows commit as they process. A mid-file crash leaves earlier rows imported; re-uploading is safe because existing SKUs are skipped.
