import { Suspense } from 'react';
import { stat } from 'fs/promises';
import { notFound } from 'next/navigation';
import { getOrderByOrderNo } from '../../../../../src/actions/orders';
import { getSiteSettings } from '../../../../../src/lib/getSiteSettings';
import { getUploadPath } from '../../../../../src/lib/storage';
import InvoiceDocument from '../../../../../src/components/admin/InvoiceDocument';
import InvoiceActions from './InvoiceActions';

// Order contents change while an order is being edited, so never cache this.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { orderNo } = await params;
  return { title: `Invoice ${orderNo}` };
}

/**
 * Drop the logo if the file behind it is gone.
 *
 * SiteSetting.logo can outlive its upload — the stored value currently points
 * at /uploads/settings/eghuri-logo.png, which 404s. On screen that is merely a
 * broken image, but this sheet gets printed and rasterised into a PDF, where a
 * missing logo leaves a torn placeholder box on a document handed to a customer.
 * InvoiceDocument already falls back to the site name when `logo` is absent, so
 * dropping it here degrades cleanly.
 *
 * Absolute URLs (an externally hosted logo) pass through untouched; only
 * site-relative /uploads paths are checked against disk.
 */
async function withResolvableLogo(settings) {
  const logo = settings?.logo;
  if (!logo || !logo.startsWith('/uploads/')) return settings;

  const filepath = getUploadPath(...logo.replace(/^\/uploads\//, '').split('/'));
  if (!filepath) return { ...settings, logo: null };

  try {
    const info = await stat(filepath);
    return info.isFile() ? settings : { ...settings, logo: null };
  } catch {
    return { ...settings, logo: null };
  }
}

export default async function InvoicePage({ params }) {
  const { orderNo } = await params;
  const order = await getOrderByOrderNo(orderNo);
  if (!order) notFound();

  const settings = await withResolvableLogo(await getSiteSettings());

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0 dark:bg-slate-900 dark:print:bg-white">
      {/* Scoped to the toolbar: useSearchParams forces a boundary, and the sheet
          must stay in the server-rendered HTML for the print and raster paths. */}
      <Suspense fallback={null}>
        <InvoiceActions orderNo={order.orderNo} />
      </Suspense>

      <div className="mt-6 flex justify-center px-4 print:mt-0 print:block print:p-0">
        <InvoiceDocument order={order} settings={settings} />
      </div>

      <p className="no-print mt-6 px-4 text-center text-xs text-slate-400 dark:text-slate-500">
        Printing gives selectable, full-quality text. The downloaded PDF is an image of this page.
      </p>
    </div>
  );
}
