import { stat } from 'fs/promises';
import { getUploadPath } from './storage';

/**
 * The brand fields an invoice is allowed to show.
 *
 * SiteSetting also holds jwtSecret, telegramBotToken, telegramChatId and the
 * delivery-area JSON — none of which may ever reach a rendered invoice or the
 * browser. Anything that renders brand details (the A4 invoice page, the
 * invoice preview modal) goes through this whitelist rather than passing the
 * settings row around whole.
 */
const BRAND_FIELDS = ['siteName', 'logo', 'address', 'mobile', 'email', 'siteUrl', 'copyrightText'];

/**
 * Reduce SiteSetting to the invoice's brand fields and drop a logo whose file
 * is gone.
 *
 * SiteSetting.logo can outlive its upload — the stored value currently points
 * at /uploads/settings/eghuri-logo.png, which 404s. On screen that is merely a
 * broken image, but the sheet gets printed and rasterised into a PDF, where a
 * missing logo leaves a torn placeholder box on a document handed to a customer.
 * InvoiceDocument already falls back to the site name when `logo` is absent, so
 * dropping it here degrades cleanly.
 *
 * Absolute URLs (an externally hosted logo) pass through untouched; only
 * site-relative /uploads paths are checked against disk.
 */
export async function getInvoiceBrand(settings = {}) {
  const brand = {};
  for (const field of BRAND_FIELDS) brand[field] = settings?.[field] ?? null;

  const logo = brand.logo;
  if (!logo || !logo.startsWith('/uploads/')) return brand;

  const filepath = getUploadPath(...logo.replace(/^\/uploads\//, '').split('/'));
  if (!filepath) {
    brand.logo = null;
    return brand;
  }

  try {
    const info = await stat(filepath);
    if (!info.isFile()) brand.logo = null;
  } catch {
    brand.logo = null;
  }

  return brand;
}
