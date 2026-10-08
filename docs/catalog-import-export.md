# Catalog Import / Export — Portable Implementation Guide

A synchronous, chunked import/export system for the product catalog, built on Next.js route handlers + Prisma + ExcelJS/Archiver. **Shopify-inspired**: `products.csv` carries the product-level record, and related entities live in sibling CSV files joined by **slug** rather than scattered as denormalised columns.

This guide is written so you can re-implement the feature in *any* Next.js app backed by PostgreSQL. Where the code touches the schema, adapt the field names listed in §2.2. The implementation lives in this repository (`src/lib/catalog/*`, `app/api/admin/catalog/*`, `app/admin/settings/catalog-import-export/page.jsx`).

---

## 1. Overview

| Capability | Detail |
|---|---|
| **What it exports/imports** | Products, categories, product options, variants, and upsell links |
| **File format** | **Five CSVs** in one ZIP — `products.csv`, `categories.csv`, `options.csv`, `variants.csv`, `upsells.csv` — joined by **slug** |
| **Why multiple files** | Categories carry a parent + image; variants carry their own price/SKU/stock/image. Neither fits a product row without either denormalising or nesting. One file per entity keeps every file flat and spreadsheet-editable. |
| **Join key** | **Slug**, not name and not UUID. Slugs are unique, human-readable, and stable across installs (UUIDs are not portable). |
| **Export deliverable** | `catalog-export-{timestamp}.zip` = the 5 CSVs + `images/` (real image files, never URLs) |
| **Import input** | ZIP (all or any subset of the CSVs + images), or a plain CSV / XLSX (auto-detected from columns) |
| **Processing** | Inline within the API request, chunked in batches of **50 rows** |
| **Result delivery** | The HTTP response *is* the result — export returns the ZIP, import returns a JSON report |
| **Duplicate policy** | **Per-entity, and deliberately asymmetric** — see §7.1 |
| **Variants** | **Included**, in `variants.csv`, with their option definitions in `options.csv` |

### Why chunked?
Rows are processed in chunks of 50, keeping memory usage flat regardless of catalog size: exports paginate with a Prisma cursor and stream the CSV/ZIP to disk; imports stream-parse the CSV and write in batches. Total time still scales with catalog size, but memory never does.

### Why synchronous instead of queued?
This project runs on a **VPS / Docker** where we control the reverse proxy, so there is no need for job tables, a worker process, or progress polling. The admin clicks a button and waits; the browser shows a loading state; the response carries the finished result. This removes an entire class of infrastructure (queue tables, worker supervision, stale-job recovery, status endpoints).

**Trade-off:** the whole operation must finish within one HTTP request. Chunking keeps memory flat, but total duration is bounded by the proxy timeout (§10). For this project's catalog size that is comfortably fine; if the catalog ever grows past what fits in a few minutes, the chunked functions in §6–7 are deliberately structured so a queue/worker can be wrapped around them later without rewriting the core logic.

### Why ZIP instead of a single spreadsheet?
CSV cannot embed binary image files. A ZIP archive carries the CSVs **and** folders of image files, with the CSVs referencing images by filename. XLSX cannot carry extracted image files either, so CSV + ZIP is the only format that transfers real images.

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
| `Product` | `id`, `title`, `slug` (unique), `sku` (unique, **non-nullable**), `description?`, `specification?`, `metaDescription?`, `tags?`, `unite_price` (Decimal, required), `sale_price` (Decimal?, optional), `quantity` (Int?), `status` (`publish` \| `draft`), `featured` (Boolean), `videoUrl?` |
| `Category` | `id`, `name`, `slug` (unique), `parentId?`, `image?`, `description?`, self-relation `parent`/`children` |
| `ProductImage` | `id`, `productId` FK, `image_path`, `altText?` |
| `ProductOption` | `id`, `productId` FK, `name`, `position` (`@@unique([productId, position])`, max 3 in the admin UI) |
| `ProductVariant` | `id`, `productId` FK, `sku?` (**not** unique), `options` (Json, string array), `unite_price` (Decimal?), `sale_price` (Decimal?), `quantity` (Int, required), `isDefault` (Boolean), `imageId?` → `ProductImage.id` |
| `ProductUpsell` | `productId` + `upsellId` (both → `Product.id`), `sortOrder`, `@@unique([productId, upsellId])` |

Schema notes that differ from common Laravel-style references:

| Reference convention | This project |
|---|---|
| `unit_price` int, `sale_price` required | `unite_price` Decimal, `sale_price` **nullable/optional** |
| `sku` nullable | `sku` is **non-nullable and unique** — a row without one is a row error, never `null` |
| `status` active/inactive/draft | `publish` / `draft` |
| Primary `category_id` + pivot | M2M only |
| Variants in a child table only | Variants + their option definitions both exported (§1) |
| ZipArchive / PhpSpreadsheet | `archiver` / `exceljs` |

Two consequences worth internalising:

- **`ProductVariant.sku` is nullable and not unique.** It cannot be the dedupe key on its own. §7 uses SKU when present and falls back to the `options` JSON.
- **Prices are `Decimal`.** The importer cleans currency symbols/whitespace before handing values to Prisma.

### 2.3 Where uploaded files actually live

Uploaded images are **not** under `public/`. They are stored outside the public dir and served through a route handler:

```js
// src/lib/storage.js
export const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), 'data', 'uploads');

export function getUploadPath(...segments) { /* returns null on containment escape */ }
```

So a stored `image_path` of `/api/files/products/abc.png` means:

| Layer | Value |
|---|---|
| URL | `/api/files/products/abc.png` |
| Folder passed to `getUploadPath()` | `products` |
| Real file | `data/uploads/products/abc.png` |

**Export must translate the URL back into a filesystem path** (§6.4). Joining `public/` with the stored URL — the intuitive mistake — silently resolves to a nonexistent path and drops the image.

---

## 3. Module Layout

```
src/lib/catalog/
├── constants.js      # chunk size, the five CSV column lists, valid statuses
├── paths.js          # temp work-dir resolution under os.tmpdir()
├── images.js         # sanitizeFilename, isRemotePath, resolveStoredImage, fetchRemoteImage
├── runExport.js      # buildCatalogZip() → { workDir, zipPath, count }
└── runImport.js      # importCatalogFile(filePath, originalName, workDir) → report
app/api/admin/catalog/
├── export/route.js               GET  — build ZIP, stream it back
└── import/route.js               POST — accept upload, process, return report
app/admin/settings/catalog-import-export/page.jsx
```

`constants.js` — the five column lists, which are the format's public contract:

```js
export const CHUNK_SIZE = 50;
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
export const ALLOWED_IMPORT_EXTENSIONS = ['.zip', '.csv', '.xlsx'];
export const VALID_PRODUCT_STATUSES = ['publish', 'draft'];

export const PRODUCT_COLUMNS = [
  'Title', 'Slug', 'SKU',
  'Description', 'Specification', 'Meta Description', 'Tags',
  'Unit Price', 'Sale Price', 'Quantity', 'Status', 'Featured', 'Video URL',
  'Categories', 'Category Slugs', 'Images', 'Image Alt Texts',
];

export const CATEGORY_COLUMNS = ['Name', 'Slug', 'Parent Slug', 'Description', 'Image'];
export const OPTION_COLUMNS   = ['Product Slug', 'Name', 'Position'];
export const VARIANT_COLUMNS  = ['Product Slug', 'SKU', 'Options', 'Unit Price', 'Sale Price', 'Quantity', 'Is Default', 'Image'];
export const UPSELL_COLUMNS   = ['Product Slug', 'Upsell Product Slug', 'Sort Order'];

/** Header cell -> normalised row key (see §7.6). `category_slugs` <-> `Category Slugs` */
export const COLUMN_KEY_MAP = { ... };
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
import path from 'path';
import { Readable } from 'stream';
import { requireAdmin } from '@/src/lib/catalog/auth';
import { buildCatalogZip } from '@/src/lib/catalog/runExport';

export const maxDuration = 300;

export async function GET(request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let workDir;

  try {
    const { workDir: dir, zipPath, count } = await buildCatalogZip();
    workDir = dir;
    await stat(zipPath);

    const nodeStream = createReadStream(zipPath);
    nodeStream.on('close', () => {
      rm(workDir, { recursive: true, force: true }).catch(() => {});
    });

    return new Response(Readable.toWeb(nodeStream), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="catalog-export-${timestamp()}.zip"`,
        'X-Export-Count': String(count),
      },
    });
  } catch (error) {
    if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => {});
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}
```

`maxDuration = 300` matches the proxy timeout in §10.

### `POST /api/admin/catalog/import/route.js`

Structurally identical to the export route: auth check, extension allow-list, 200 MB cap, write the buffer into a fresh work dir, call `importCatalogFile`, return `{ success: true, ...report }`, and `rm` the work dir in `finally`.

> If the client sends a body larger than the server's limit, the platform rejects the request before this handler runs — see §8 for the nginx configuration that keeps the error friendly.

---

## 6. Export Logic — `buildCatalogZip()` in `src/lib/catalog/runExport.js`

### 6.1 Shape

- Chunked with Prisma **cursor pagination** (batches of 50) so memory stays flat.
- Each CSV is written as a stream (`csv-stringify` piped to disk) prefixed with a UTF-8 BOM (`\xEF\xBB\xBF`).
- Images are copied/downloaded into `images/products/` and `images/categories/`.
- Work dir lives in the OS temp dir and is removed after the ZIP is streamed.

```js
export async function buildCatalogZip() {
  const workRoot = exportWorkDir();
  const buildDir = path.join(workRoot, 'build');
  const imageDir = path.join(buildDir, 'images');
  const csvPath  = path.join(buildDir, 'products.csv');
  const zipPath  = path.join(workRoot, 'catalog-export.zip');

  await mkdir(path.join(imageDir, 'products'), { recursive: true });
  await mkdir(path.join(imageDir, 'categories'), { recursive: true });

  try {
    await writeCsv(path.join(buildDir, 'categories.csv'), CATEGORY_COLUMNS, categoryRows);
    await writeCsv(path.join(buildDir, 'upsells.csv'),   UPSELL_COLUMNS,   upsellRows);
    await exportProducts({ csvPath, imageDir });   // the chunked one

    await buildZip(buildDir, zipPath);
    return { workDir: workRoot, zipPath, count };
  } catch (error) {
    await rm(workRoot, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}
```

Small entities (categories, options, upsells) are read in one query — they are bounded and tiny relative to products. Only the product query is paginated.

### 6.2 ZIP structure

```
catalog-export-{timestamp}.zip
├── products.csv        one row per product
├── categories.csv      one row per category, including roots
├── options.csv         one row per product option definition
├── variants.csv        one row per variant
├── upsells.csv         one row per product→upsell link
└── images/
    ├── products/{productSlug}-{index}-{basename}
    └── categories/{categorySlug}-{basename}
```

Every file is optional **on import** — a ZIP holding only `products.csv` is still valid (§7.2).

### 6.3 Column reference

**`products.csv`**

```
Title, Slug, SKU, Description, Specification, Meta Description, Tags,
Unit Price, Sale Price, Quantity, Status, Featured, Video URL,
Categories, Category Slugs, Images, Image Alt Texts
```

| Column | Notes |
|---|---|
| `Title` | Product title (**required** on import) |
| `Slug` | Auto-generated on import if blank |
| `SKU` | Dedupe key on import. **Required** — the column is non-nullable (§2.2) |
| `Description` / `Specification` / `Meta Description` / `Tags` | Plain text |
| `Unit Price` | Decimal, **required** on import |
| `Sale Price` | Decimal, optional (nullable in schema) |
| `Quantity` | Stock quantity (base, non-variant stock) |
| `Status` | `publish` \| `draft` (default `draft`) |
| `Featured` | `true` \| `false` |
| `Video URL` | Optional product video |
| `Categories` | Comma-separated category **names**, human-readable |
| `Category Slugs` | Comma-separated **slugs** — authoritative for linking (§7.4) |
| `Images` | Comma-separated filenames under `images/products/` |
| `Image Alt Texts` | **Parallel list to `Images`** — same order, same length |

**`categories.csv`**

```
Name, Slug, Parent Slug, Description, Image
```

`Parent Slug` is a **slug**, not a name. This is what makes hierarchy portable: a parent row may declare `Slug = cosmetics` while `Name = কসমেটিকস`, and resolving by name would fork a duplicate orphan node. `Image` is a filename under `images/categories/`.

**`options.csv`**

```
Product Slug, Name, Position
```

`Position` is the 0-based ordinal that `variants.csv`'s `Options` array lines up with.

**`variants.csv`**

```
Product Slug, SKU, Options, Unit Price, Sale Price, Quantity, Is Default, Image
```

`Options` is the **JSON array string** exactly as stored, e.g. `["M","Red"]` — preserving it verbatim means import never has to reason about positional alignment against `options.csv`. `Image` references one of the parent product's filenames in `Images`.

**`upsells.csv`**

```
Product Slug, Upsell Product Slug, Sort Order
```

### 6.4 Image handling on export

Filename scheme is **`{slug}-{index}-{basename}`**. Slugs, not UUIDs: a UUID is unique within one database and meaningless in another, so an archive named by UUID cannot be reasoned about (or hand-edited) on the machine it is imported into.

Resolving a stored `image_path` back to a file is the delicate part (§2.3):

```js
// src/lib/catalog/images.js
import { getUploadPath } from '@/src/lib/storage';
import { existsSync } from 'fs';
import path from 'path';

/**
 * Translate a stored `image_path` into something export can read.
 * @returns {{kind:'remote', url:string} | {kind:'local', path:string} | null}
 */
export function resolveStoredImage(imagePath) {
  const value = String(imagePath || '');
  if (!value) return null;

  if (isRemotePath(value)) return { kind: 'remote', url: value };

  // Current form: /api/files/<folder>/<name>  (served by app/api/files/[...path])
  // Legacy form:  /uploads/<folder>/<name>   (pre-route-handler)
  const parts = value.replace(/^\/+/, '').split('/').filter(Boolean);
  const markerIndex = parts.findIndex((p) => p === 'api' || p === 'uploads');
  if (markerIndex === -1) return null;

  // The two forms carry different numbers of fixed segments before the folder:
  //   /api/files/<folder>/<name>  -> three: api, files, folder
  //   /uploads/<folder>/<name>    -> two:   uploads, folder
  // Treating them alike silently resolves to a folder that does not exist.
  const afterMarker = parts.slice(markerIndex + 1);
  const rest = parts[markerIndex] === 'api' && afterMarker[0] === 'files' ? afterMarker.slice(1) : afterMarker;

  const folder = rest[0];
  const name = rest.slice(1).join('/');
  if (!folder || !name) return null;

  const file = getUploadPath(folder, name);   // null if it escapes UPLOAD_BASE_DIR
  if (!file || !existsSync(file)) return null;

  return { kind: 'local', path: file };
}
```

Then the copier:

```js
async function exportImage(imageDir, prefix, index, imagePath) {
  const source = resolveStoredImage(imagePath);
  if (!source) return null;                    // unresolved -> skipped, counted, not fatal

  const filename = `${prefix}-${index}-${sanitizeFilename(imagePath)}`;
  const target = path.join(imageDir, filename);

  try {
    if (source.kind === 'remote') {
      const buffer = await fetchRemoteImage(source.url);  // timeout + size guard inside
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
```

**Do not swallow failures silently in aggregate.** `buildCatalogZip` returns a `missingImages` count alongside `count`, and the route surfaces it, so "the export dropped half your images" is visible rather than inferred from an empty folder.

Other image rules:

- Product images are written in `ProductImage` row order, which is display order.
- Remote URLs (seeded data) are downloaded at export time; failures are skipped.
- `{prefix}` is the product slug (or index for the product itself) and the category slug.

---

## 7. Import Logic — `importCatalogFile()` in `src/lib/catalog/runImport.js`

### 7.1 Duplicate policy per entity

Deliberately asymmetric, because the entities have different jobs:

| Entity | Policy | Why |
|---|---|---|
| **Categories** | **Upsert by slug** — update name/description/parent/image | The whole point is being able to *repair* a hierarchy and images. A create-only policy makes a wrong parent permanently unfixable by re-import. A blank `Image` column leaves the existing image alone rather than wiping it. |
| **Products** | Skip on existing SKU | Long-standing guarantee; products are never overwritten. |
| **Options** | Create for newly created products | Tied to product creation. |
| **Variants** | Skip when a variant with the same SKU **or** the same `options` array already exists on that product | `ProductVariant.sku` is nullable and not unique, so neither key alone is sufficient (§2.2). Checking both prevents two rows of the same size/colour combination from both being created. Never overwrites. |
| **Upsells** | Skip on existing `(productId, upsellId)` | That pair is the schema's own unique key. |

Because products skip on SKU but variants resolve their parent **by slug**, a variant row can attach to a product that already existed — so variants are not limited to freshly imported products.

### 7.2 Orchestration and ordering

```js
export async function importCatalogFile(filePath, originalName, workDir) {
  const extension = path.extname(originalName).toLowerCase();

  if (extension === '.zip') {
    const extractedDir = path.join(workDir, 'extracted');
    await mkdir(extractedDir, { recursive: true });
    extractZipGuarded(filePath, extractedDir);

    const present = (name) => existsSync(path.join(extractedDir, name));

    // Order is load-bearing:
    //  1. categories  -> product rows can link by slug, and parents resolve
    //  2. products    -> creates ProductImage rows
    //  3. options     -> needs product ids
    //  4. variants    -> needs product ids AND their image ids (step 2)
    //  5. upsells     -> needs two product ids
    const report = { imported: 0, skipped: 0, errors: [], byType: {} };

    if (present('categories.csv')) await importCategories(path.join(extractedDir, 'categories.csv'), extractedDir, report);
    if (present('products.csv'))   await importProducts(path.join(extractedDir, 'products.csv'),   extractedDir, report);
    if (present('options.csv'))    await importOptions(path.join(extractedDir, 'options.csv'),    report);
    if (present('variants.csv'))   await importVariants(path.join(extractedDir, 'variants.csv'), report);
    if (present('upsells.csv'))    await importUpsells(path.join(extractedDir, 'upsells.csv'),  report);

    return report;
  }

  const fileType = await detectFileType(filePath, extension);
  const report = { imported: 0, skipped: 0, errors: [], byType: {} };

  if (fileType === 'categories') await importCategories(filePath, '', report);
  else                          await importProducts(filePath, '', report);

  return report;
}
```

Every entity present is imported; absent files are skipped silently. A ZIP with only `products.csv` — the shape older exports produced — still imports.

### 7.3 Categories: two-pass, order-independent parenting

Writing `parentId` while streaming a single pass makes the result depend on row order — a child listed before its parent cannot resolve. So categories are written in **two passes**:

```js
async function importCategories(filePath, extractedDir, report) {
  const slugToId = new Map(
    (await prisma.category.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id])
  );
  const pendingParents = [];   // { id, parentSlug, rowNumber }
  const errors = [];

  let imported = 0;
  let skipped = 0;

  for await (const batch of rowStream(filePath)) {
    for (const { row, rowNumber } of batch) {
      const name = clean(row.name);
      if (!name) { rowError(errors, rowNumber, 'Name is required.'); skipped++; continue; }

      const slug = uniqueSlug(clean(row.slug) || slugify(name), slugToId);
      const imagePath = await importCategoryImage(row.image, extractedDir, errors, rowNumber);

      const data = {
        name,
        description: clean(row.description),
        // Only overwrite the image when the file actually gave us one.
        ...(imagePath ? { image: imagePath } : {}),
      };

      const category = slugToId.has(slug)
        ? await prisma.category.update({ where: { slug }, data })          // upsert branch
        : await prisma.category.create({ data: { ...data, slug } });      // insert branch

      slugToId.set(slug, category.id);
      pendingParents.push({ id: category.id, parentSlug: clean(row.parent_slug), rowNumber });
      imported++;
    }
  }

  // Pass 2 — every category now exists, so parents resolve regardless of row order.
  for (const { id, parentSlug, rowNumber } of pendingParents) {
    if (!parentSlug) { await prisma.category.update({ where: { id }, data: { parentId: null } }); continue; }

    if (parentSlug === (await prisma.category.findUnique({ where: { id }, select: { slug: true } })).slug) {
      rowError(errors, rowNumber, `Category "${parentSlug}" cannot be its own parent.`);
      continue;
    }

    const parentId = slugToId.get(parentSlug);
    if (!parentId) {
      rowError(errors, rowNumber, `Parent category "${parentSlug}" not found.`);
      continue;
    }

    await prisma.category.update({ where: { id }, data: { parentId } });
  }

  await detectCycles(prisma);   // belt-and-braces: refuse to persist a cycle

  tally(report, 'categories', imported, skipped, errors);
}
```

Two details that are easy to get wrong:

- **Do not call `uniqueSlug()` and then test for a collision.** `uniqueSlug()` loops until the result is *absent* from the set, so a following `if (seen.has(slug))` can never fire — the skip branch becomes dead code and duplicates get created as `name-2`, `name-3`. Decide skip-vs-rename from the *pre-rename* value.
- **Blanking a field must not wipe data.** An empty `Image` omits `image` from the update payload entirely.

Cycle detection walks `parentId` upward per category with a visited set and a depth cap, and reports offenders as row errors rather than persisting a loop.

### 7.4 Products

```js
async function importProducts(filePath, extractedDir, report) {
  const existingSkus = new Set(
    (await prisma.product.findMany({ select: { sku: true } })).map((p) => p.sku.trim())
  );
  const seenSlugs = new Set((await prisma.product.findMany({ select: { slug: true } })).map((p) => p.slug));
  const errors = [];
  let imported = 0, skipped = 0;

  for await (const batch of rowStream(filePath)) {
    for (const { row, rowNumber } of batch) {
      const sku = clean(row.sku);
      if (sku && existingSkus.has(sku)) { skipped++; continue; }

      const title = clean(row.title);
      const unitPrice = priceOf(row.unit_price);

      if (!title)            { rowError(errors, rowNumber, 'Title is required.'); skipped++; continue; }
      if (unitPrice === null){ rowError(errors, rowNumber, 'Unit price is required.'); skipped++; continue; }

      // `sku` is non-nullable and unique — validate before writing, never pass null.
      if (!sku)              { rowError(errors, rowNumber, 'SKU is required (the column is not nullable).'); skipped++; continue; }

      const status = (clean(row.status) || 'draft').toLowerCase();
      if (!VALID_PRODUCT_STATUSES.includes(status)) {
        rowError(errors, rowNumber, `Invalid status "${status}". Allowed: ${VALID_PRODUCT_STATUSES.join(', ')}.`);
        skipped++; continue;
      }

      const slug = uniqueSlug(clean(row.slug) || slugify(title), seenSlugs);

      const product = await prisma.product.create({
        data: {
          title, slug, sku,
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
        await prisma.product.update({ where: { id: product.id }, data: { categories: { set: categoryIds } } });
      }

      if (sku) existingSkus.add(sku);
      seenSlugs.add(slug);

      await importProductImages(product, extractedDir, row.images, row.image_alt_texts, rowNumber, errors);
      imported++;
    }
  }

  tally(report, 'products', imported, skipped, errors);
}
```

`resolveCategoryIds` prefers slugs and falls back to names — but the fallback must not slugify blindly:

```js
async function resolveCategoryIds(row) {
  const found = [];
  const linkedNames = new Set();

  // Slugs first — they are the authoritative link.
  for (const slug of splitList(row.category_slugs)) {
    const category = await prisma.category.findUnique({ where: { slug }, select: { id: true, name: true } });
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
      if (match) { found.push(match); continue; }

      const slug = slugify(name);
      found.push(await prisma.category.upsert({ where: { slug }, update: {}, create: { name, slug } }));
    }
  }

  return [...new Map(found.map((c) => [c.id, c])).values()];
}
```

Slugifying a name is only correct when the category actually has an auto-generated slug. A category with a custom slug — `Name = Root Parent`, `Slug = custom-parent-slug` — would otherwise be duplicated under `root-parent` on **every** import, because `slugify(name)` never reproduces a hand-set slug. Matching an already-linked category by name before creating anything is what keeps a round-trip from growing a phantom node.

### 7.5 Options, variants, upsells

```js
async function importOptions(filePath, report) {
  // group by product slug, then createMany — position comes from the CSV, not the row order
  const bySlug = new Map();
  for await (const batch of rowStream(filePath)) {
    for (const { row, rowNumber } of batch) {
      const slug = clean(row.product_slug);
      const name = clean(row.name);
      if (!slug || !name) continue;
      if (!bySlug.has(slug)) bySlug.set(slug, []);
      bySlug.get(slug).push({ name, position: intOrNull(row.position) ?? bySlug.get(slug).length });
    }
  }

  for (const [slug, options] of bySlug) {
    const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!product) continue;
    await prisma.productOption.deleteMany({ where: { productId: product.id } });
    await prisma.productOption.createMany({ data: options.map((o) => ({ ...o, productId: product.id })) });
  }
}
```

```js
async function importVariants(filePath, report, context) {
  const productsBySlug = new Map(
    (await prisma.product.findMany({ select: { id: true, slug: true } })).map((p) => [p.slug, p])
  );

  // Both keys are tracked per product and a row is skipped if *either* already
  // exists. One key is not enough: a file giving one row a SKU and another the
  // same options would otherwise produce two variants of an identical combination.
  const seenByProduct = new Map();
  for (const v of await prisma.productVariant.findMany({ select: { productId: true, sku: true, options: true } })) {
    if (!seenByProduct.has(v.productId)) seenByProduct.set(v.productId, { skus: new Set(), options: new Set() });
    const bucket = seenByProduct.get(v.productId);
    if (v.sku) bucket.skus.add(v.sku);
    const list = normalizeOptionList(v.options);
    if (list.length) bucket.options.add(JSON.stringify(list));
  }

  for await (const batch of rowStream(filePath)) {
    for (const { row, rowNumber } of batch) {
      const slug = clean(row.product_slug);
      const product = slug ? productsBySlug.get(slug) : null;
      if (!product) { rowError(errors, rowNumber, `Product "${slug || ''}" not found for variant.`); skipped++; continue; }

      const options = parseOptions(row.options);   // JSON array of strings, [] on failure
      const sku = clean(row.sku);
      const seen = seenByProduct.get(product.id) ?? { skus: new Set(), options: new Set() };

      const skuTaken = sku ? seen.skus.has(sku) : false;
      const optionsTaken = options.length > 0 && seen.options.has(JSON.stringify(options));
      if (skuTaken || optionsTaken) { skipped++; continue; }   // never overwrite

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
}
```

Note the options check is skipped for an empty array: a product whose variants have no
options at all is discriminated by SKU, and treating every empty array as the same
combination would collapse them into one.

### 7.5.1 Variant image resolution

A variant's `Image` cell names one of its parent product's files. Two cases, in order:

```js
async function resolveVariantImageId(product, imageColumn, context) {
  const archiveName = path.basename(clean(imageColumn) || '');
  if (!archiveName) return null;

  // 1. The product was created in this run — use the id we just recorded.
  const hit = context.imageIdsByProduct.get(product.id)?.get(archiveName);
  if (hit) return hit;

  // 2. The product already existed (skipped as a duplicate SKU), so image_path still
  //    holds the ORIGINAL stored basename. The exporter wrote
  //    `{productSlug}-{index}-{storedBasename}`, so strip the prefix we added and
  //    match on what is left.
  let storedName = archiveName;
  if (product.slug && storedName.startsWith(`${product.slug}-`)) {
    storedName = storedName.slice(product.slug.length + 1).replace(/^\d+-/, '');
  }
  if (!storedName || storedName === archiveName) return null;

  const images = await prisma.productImage.findMany({
    where: { productId: product.id },
    select: { id: true, image_path: true },
  });
  return images.find((i) => path.basename(String(i.image_path || '')) === storedName)?.id ?? null;
}
```

A plain basename comparison is **not** enough: the archive filename carries the slug and
index prefix that only the exporter added, so it never equals what `image_path` stores.

Upsells are the simplest: resolve both slugs, then create only when the `(productId, upsellId)` pair is new.

### 7.6 Helpers

```js
const clean = (v) => (v == null ? null : String(v).trim() || null);

function priceOf(value) {
  const v = clean(value);
  if (v == null) return null;
  const n = parseFloat(v.replace(/[^0-9.-]/g, ''));   // strips ৳, commas, spaces
  return Number.isFinite(n) ? n : null;                 // Prisma Decimal accepts floats/strings
}

function intOrNull(value) {
  const n = parseInt(clean(value), 10);
  return Number.isFinite(n) ? Math.max(0, n) : null;
}

const truthy = (v) => ['true', '1', 'yes', 'y'].includes(String(clean(v) || '').toLowerCase());

function splitList(value) {
  const v = clean(value);
  if (!v) return [];
  return [...new Set(v.split(/[,;|]/).map((s) => s.trim()).filter(Boolean))];
}

function parseOptions(value) {
  const v = clean(value);
  if (!v) return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed.map(String) : splitList(v);
  } catch {
    return splitList(v);      // tolerate "M, Red" as well as '["M","Red"]'
  }
}

function slugify(text) {
  const base = String(text).toLowerCase().trim()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')         // keep Bengali letters
    .replace(/^-+|-+$/g, '');
  return base || `item-${Date.now()}`;                // Bengali-only titles survive; empty falls back
}

function uniqueSlug(base, seen) {
  let slug = base, suffix = 2;
  while (seen.has(slug)) slug = `${base}-${suffix++}`;
  return slug;
}

/** Header cell -> row key. `Category Slugs` -> `category_slugs`, `Unit Price` -> `unit_price`. */
function normalizeKey(name) {
  return String(name)
    .replace(/^\xEF\xBB\xBF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
```

`normalizeKey` is what lets `Unit Price` and `unit_price` both land on `unit_price`. Any header whose words differ only by spacing/case needs no special-casing; only genuinely renamed headers do (map those in `COLUMN_KEY_MAP`).

### 7.7 Row streaming (chunks of 50)

```js
async function* rowStream(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let batch = [];

  if (ext === '.xlsx') {
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
      if (batch.length >= CHUNK_SIZE) { yield batch; batch = []; }
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
      batch.push({ row, rowNumber: r });
      if (batch.length >= CHUNK_SIZE) { yield batch; batch = []; }
    }
  }

  if (batch.length) yield batch;
}
```

> **ExcelJS gotcha:** `getRow().values` is 1-indexed and element `0` is always empty — always map through header column numbers, never assume offsets.

### 7.8 Image resolution order (import)

1. `extracted/images/{products|categories}/{basename}` — from the uploaded ZIP
2. an existing path under `UPLOAD_BASE_DIR` — via `resolveStoredImage()`
3. remote URL — downloaded into `getUploadPath(folder, name)`

Imported images are stored under a **folder-scoped URL** (`/api/files/products/<name>`) so the same resolver in §6.4 can read them back out on a later export. Naming is `{productId|slug}-{index}{ext}`.

A **blank** image column is not an error — it simply means "no image". A **named but missing** image is a row error, and never aborts the import.

### 7.9 Guarded ZIP extraction

```js
function extractZipGuarded(zipPath, extractTo) {
  const zip = new AdmZip(zipPath);
  const resolvedTarget = path.resolve(extractTo);

  for (const entry of zip.getEntries()) {
    const name = entry.entryName.replace(/\\/g, '/');

    if (name.includes('..') || path.isAbsolute(name) || /^[A-Za-z]:\//.test(name)) continue; // traversal guard
    if (entry.isDirectory) continue;

    const target = path.resolve(extractTo, name);
    if (target !== resolvedTarget && !target.startsWith(resolvedTarget + path.sep)) continue;  // containment

    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, entry.getData());
  }
}
```

### 7.10 Type auto-detection (standalone files)

Read the first row of headers and classify, in this order:

| Signature (normalised keys) | Type |
|---|---|
| `product_slug` + `upsell_product_slug` | **upsells** |
| `product_slug` + `options` | **variants** |
| `product_slug` + `name` | **options** |
| `title` or `sku` | **products** |
| `name` | **categories** |
| otherwise | fail with a clear message |

Order is load-bearing. `variants.csv` carries a `SKU` column, so testing `sku` first would
classify it as a product file and report every row as *"Title is required"* — a baffling
error for a file that is perfectly valid on its own. All five types work standalone,
because each resolves its products by slug against the database.

### 7.11 The report

```js
{
  success: true,
  imported: 128,          // totals, kept for backward compatibility
  skipped: 4,
  errors: [ { row: 12, message: 'Parent category "cosmetics" not found.' } ],
  byType: {
    categories: { imported: 8,  skipped: 0, errors: [] },
    products:   { imported: 30, skipped: 0, errors: [] },
    options:    { imported: 2,  skipped: 0, errors: [] },
    variants:   { imported: 4,  skipped: 0, errors: [] },
    upsells:    { imported: 6,  skipped: 0, errors: [] },
  }
}
```

`byType` exists because "30 imported" is not actionable when 4 of them were variants. The admin page renders one card per entity (§9).

---

## 8. Upload Size Handling

Route handlers receive the whole multipart body before your validation runs, so a too-large upload fails at the **reverse proxy**, not in code. On the VPS/nginx:

```nginx
# /etc/nginx/sites-available/your-app
client_max_body_size 210M;   # must exceed the app's 200 MB cap (multipart overhead)
client_body_timeout 300s;
proxy_read_timeout 300s;     # see §10 — exports/imports run inside one request
```

The handler's own `MAX_UPLOAD_BYTES` check remains as defense in depth and returns a friendly `413` JSON when hit directly (e.g., local dev).

---

## 9. Frontend — `app/admin/settings/catalog-import-export/page.jsx`

Client component following the Backup DB page patterns. Two cards plus a report panel:

- **Export Catalog** card:
  - Button triggers `fetch('/api/admin/catalog/export')` → reads the response as a blob → parses the filename from `Content-Disposition` → triggers a browser download.
  - While fetching: spinner/disabled state ("Building ZIP…"). Large catalogs can take a while — the button must stay disabled until the blob arrives.
  - Non-OK responses are parsed as JSON and shown as an error toast.
  - If the response carries `X-Export-Count` / `X-Missing-Images`, surface it — a silently truncated image folder is worse than a visible warning. `X-Missing-Images` is what catches the §6.4 failure mode, where every image silently resolves to a nonexistent path.
- **Import Catalog** card:
  - File input accepting `.zip,.csv,.xlsx`.
  - Submit → `FormData` POST with spinner ("Importing…").
  - On success, render `byType` as **one card per entity** plus a toggleable list of row errors (`Row N: message`).
  - On failure, show the `error` message.
- **Copy must match reality.** The card previously said *"existing data is never overwritten"* and *"categories are matched by name"*. Both are now wrong in specific ways (§7.1): products and variants are never overwritten, but **categories are upserted by slug**. Say so plainly rather than leaving a blanket guarantee that the code does not honour.

Wiring (same two-line changes made for Backup DB):

1. Add the page title to the title map in `app/admin/layout.jsx`.
2. Add a "Catalog I/O" entry to the Settings section in `app/admin/partials/AdminSidebar.jsx`.

There is no polling, no Recent Jobs table, and no status endpoint — nothing persists between requests.

---

## 10. Long Requests & Timeouts

Because processing happens inside one request, the reverse proxy must allow long-running responses:

```nginx
proxy_read_timeout 300s;
proxy_send_timeout 300s;
```

Route handlers also declare `export const maxDuration = 300`.

Notes:

- Self-hosted `next start` has no execution time limit of its own — only nginx (or another proxy in front) cuts requests off.
- Export duration is dominated by **image copying/downloads**. Local-upload-only catalogs export near-instantly.
- If the catalog ever outgrows comfortable request durations, the chunked functions are structured so a queue/worker can wrap them later without rewriting the core logic.

---

## 11. Operations / Deployment

- **Nothing to supervise** — no worker process exists. Deploy as usual; the feature activates with the next build.
- **Temp files** — all working files live under `os.tmpdir()` and are deleted when the request finishes. No persistent storage volume is required.
- **Environment variables**: none beyond the existing `DATABASE_URL` (plus `UPLOAD_DIR` if uploads live outside the project).
- **nginx**: `client_max_body_size 210M` + `proxy_read_timeout 300s` (§8, §10).
- **Concurrent clicks**: two simultaneous exports/imports are safe — each gets its own timestamped temp dir; imports dedupe against live DB state, so worst case the second run reports the first run's rows as "skipped".

---

## 12. Security

| Concern | Mitigation |
|---|---|
| Unauthorized access | Routes behind `proxy.js` JWT guard (`/admin/:path*` matcher) + inline token check per handler |
| Malicious ZIP (path traversal) | Reject entries containing `..`, absolute paths, or drive-letter prefixes; verify extraction target stays within the work dir |
| Image filename traversal | `sanitizeFilename()` (basename + character whitelist) before every copy |
| Upload path escape | All writes go through `getUploadPath()`, which returns `null` outside `UPLOAD_BASE_DIR` |
| Upload size | 200 MB app cap + nginx `client_max_body_size` |
| Remote URL fetch (export & import) | `fetch` with timeout + response-size guard; failures skipped, never fatal |
| Category hierarchy abuse | Self-parent and cycle detection (§7.3) — a cycle makes the storefront nav recurse |
| SQL injection | All access through Prisma parameterized queries |
| Temp file leakage | Work dirs under `os.tmpdir()`, removed in `finally` / on stream close |

---

## 13. Testing / Manual QA

No automated test framework is configured yet (see `docs/testing.md`). Manual QA checklist:

| Scenario | Expected |
|---|---|
| Export with local + remote images | ZIP contains 5 CSVs + **all** reachable images under `images/{products,categories}/`; `missingImages` reports anything skipped |
| Local uploads are actually found | `images/products/` count matches `ProductImage` rows whose files exist on disk — this is the regression guard for §6.4 |
| Bengali titles + category names survive round-trip | BOM-prefixed CSVs open correctly in Excel; re-import preserves text and slugs |
| Re-import the export into the **same** DB | Everything skipped, **zero** new rows, zero duplicate categories — proves idempotency and the §7.3 policy |
| Import the export into a **clean** DB | Products, categories (hierarchy + images), options, variants, upsells all restored |
| Parent/child round-trip | A child category has the correct `parentId` after re-import, regardless of row order in the CSV |
| Custom parent slug | Parent declared `Slug=cosmetics, Name=কসমেটিকস` → child links to `cosmetics`, no duplicate node created |
| Category upsert repairs a wrong parent | Existing category with a bad `parentId` is corrected by re-import |
| Blank `Image` column on a category | Existing image preserved, **not** wiped |
| Self-referencing parent row | Row error naming the category; no cycle persisted |
| Category name containing a comma | Documented limitation of the delimited list format (§15) |
| Blank `SKU` on a product row | Row error (`SKU is required`), **other rows still import**, request does not 500 |
| Missing title / unit price row | Reported in `errors` with row number; other rows still imported |
| Invalid status value | Row error listing allowed values |
| Duplicate SKU within file | Second occurrence skipped |
| Variant with blank SKU, duplicate `options` | Skipped via the options fallback key |
| Variant referencing a missing product slug | Row error naming the slug |
| Variant image | Points at the correct `ProductImage` of the parent product |
| Standalone products CSV | Auto-detected; categories auto-created and linked |
| Standalone categories CSV (`Name` header) | Only categories touched; no image errors when `Image` is absent |
| ZIP with only `products.csv` | Imports fine (older-export shape) |
| Non-.zip/.csv/.xlsx upload | 400 with clear message |
| >200 MB upload | 413 (from nginx or handler) |
| Cancel/refresh mid-import | Partial import possible (no transaction across the whole file) — verify counts and re-import behavior |

Future Jest suite outline (when testing is introduced): round-trip identity, per-entity skip policy, cycle rejection, path-resolution units, price/slug helpers.

---

## 14. Usage Walkthrough

### Export

1. Open **Admin → Settings → Catalog I/O**.
2. Click **Export Catalog** and wait (spinner shows progress state).
3. The browser downloads `catalog-export-{timestamp}.zip`.
4. Extract to see 5 CSVs plus `images/products/` and `images/categories/`.

### Import

1. On the same page, choose a **ZIP** (any subset of the CSVs + images) or a plain **CSV/XLSX** (products or categories — detected from the columns).
2. Click import and wait.
3. Review the per-entity summary: imported / skipped / errors for each of categories, products, options, variants, upsells.
4. Errors: fix the offending rows and re-upload; valid rows whose SKU or slug now exists are skipped as duplicates, not re-created. Categories are re-applied, so re-uploading is how you repair a hierarchy.

### Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Export request times out (504) | Too many images → raise `proxy_read_timeout` (§10) or reduce catalog size |
| Download never starts | Check browser network tab; non-OK responses return JSON errors instead of the ZIP |
| `images/` folder empty or missing entries | `resolveStoredImage()` (§6.4) is joining the wrong base dir — stored paths are `/api/files/<folder>/<name>` served from `UPLOAD_BASE_DIR`, **not** `public/` |
| Import 500s on a specific row | Usually a non-nullable column written as `null` — `Product.sku` (§2.2) |
| Import shows skipped for everything | Expected on a re-import of the same archive (SKUs/slugs exist) |
| Category duplicated as `name-2` | A code path called `uniqueSlug()` before its skip check (§7.3) |
| Child category attached to the wrong parent | Parent must be referenced by **slug**, not name |
| Bengali/UTF-8 garbled in Excel | File includes a UTF-8 BOM; open with a BOM-aware tool or re-save as UTF-8 |
| Partial import after an error mid-file | Rows before the failure point were committed; fix the failing row and re-upload |

---

## 15. FAQ / Edge Cases

- **Why five files instead of one?** Categories carry a parent and an image; variants carry their own price, SKU, stock, and image. Forcing both into a product row means either repeating product fields per variant or collapsing them into an opaque JSON blob. One file per entity keeps every file flat and editable in a spreadsheet.
- **Why is slug the join key, not name or UUID?** Names are editable and collide; UUIDs are not portable across installs. Slugs are unique, readable, and stable.
- **What about a category whose `Image` cell is empty on re-import?** The existing image is left untouched. An import never deletes data it was not given.
- **Can a category import create a cycle?** No — self-parent and cycle detection report row errors instead of persisting the loop (§7.3).
- **Are existing categories overwritten?** Yes — categories are upserted by slug, deliberately, so hierarchy and images are repairable. Products (by SKU), variants, and upsells are strictly create-only.
- **Do variants get exported?** Yes, in `variants.csv`, with their option definitions in `options.csv`.
- **Do old exports still import?** Yes. A ZIP containing only `products.csv` is valid, and a `Categories` name column without `Category Slugs` still resolves.
- **What happens to product images when a SKU is skipped?** Nothing — skipped rows never touch the database.
- **Can I import categories without products?** Yes — upload a CSV with a `Name` header; it's auto-detected and only categories are touched.
- **Can I export only a filtered set?** No — export always covers the full catalog.
- **Category names containing a comma?** The delimited list format cannot represent those unambiguously; they will be split into two categories. Use a name without commas.
- **Is the import atomic?** No — rows commit as they process. A mid-file crash leaves earlier rows imported; re-uploading is safe.