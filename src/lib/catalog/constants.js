export const CHUNK_SIZE = 50;

export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
export const ALLOWED_IMPORT_EXTENSIONS = ['.zip', '.csv', '.xlsx'];

export const PRODUCT_COLUMNS = [
  'Title',
  'Slug',
  'SKU',
  'Description',
  'Meta Description',
  'Tags',
  'Unit Price',
  'Sale Price',
  'Quantity',
  'Status',
  'Categories',
  'Images',
];

export const CATEGORY_COLUMNS = ['Name', 'Slug', 'Parent', 'Description'];

export const VALID_PRODUCT_STATUSES = ['publish', 'draft'];
