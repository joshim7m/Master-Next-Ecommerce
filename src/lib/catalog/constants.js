export const CHUNK_SIZE = 50;

export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
export const ALLOWED_IMPORT_EXTENSIONS = ['.zip', '.csv', '.xlsx'];

export const VALID_PRODUCT_STATUSES = ['publish', 'draft'];

/** Sub-folder of `images/` that each entity's files are written into. Also the
 *  folder segment used when storing an imported file back (`/api/files/<folder>/<name>`). */
export const IMAGE_FOLDERS = {
  products: 'products',
  categories: 'categories',
};

/**
 * The five CSV column lists. These are the format's public contract — changing a
 * header here changes what existing archives mean, so treat them as append-only
 * and map renamed headers through COLUMN_KEY_MAP instead.
 *
 * See docs/catalog-import-export.md §6.3 for the per-column notes.
 */

export const PRODUCT_COLUMNS = [
  'Title',
  'Slug',
  'SKU',
  'Description',
  'Specification',
  'Meta Description',
  'Tags',
  'Unit Price',
  'Sale Price',
  'Quantity',
  'Status',
  'Featured',
  'Video URL',
  'Categories',
  'Category Slugs',
  'Images',
  'Image Alt Texts',
];

export const CATEGORY_COLUMNS = ['Name', 'Slug', 'Parent Slug', 'Description', 'Image'];

export const OPTION_COLUMNS = ['Product Slug', 'Name', 'Position'];

export const VARIANT_COLUMNS = [
  'Product Slug',
  'SKU',
  'Options',
  'Unit Price',
  'Sale Price',
  'Quantity',
  'Is Default',
  'Image',
];

export const UPSELL_COLUMNS = ['Product Slug', 'Upsell Product Slug', 'Sort Order'];

/** Entity keys used in the import report's `byType` map. */
export const ENTITY_TYPES = ['categories', 'products', 'options', 'variants', 'upsells'];

/**
 * Header aliases that `normalizeKey()` alone cannot reconcile, because the words
 * genuinely differ rather than just in spacing/case. Keyed by the normalised
 * form of whatever the header says, valued by the canonical row key the importer
 * reads.
 *
 * `normalizeKey('Category Slugs') === 'category_slugs'`, so the modern headers
 * need no entry here — only legacy spellings do.
 */
export const COLUMN_KEY_MAP = {
  // Pre-§7.3 archives carried the parent's NAME in a `Parent` column.
  parent: 'parent_slug',
  // Pre-§7.4 archives had no slug column; `Categories` (names) is still honoured.
  category: 'categories',
};