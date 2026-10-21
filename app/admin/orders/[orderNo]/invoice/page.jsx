import { notFound } from 'next/navigation';
import { getOrderByOrderNo } from '../../../../../src/actions/orders';
import { getSiteSettings } from '../../../../../src/lib/getSiteSettings';
import { getInvoiceBrand } from '../../../../../src/lib/invoiceBrand';
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
 * The rule lives in `getInvoiceBrand` (src/lib/invoiceBrand.js) so the invoice
 * preview modal in the orders list resolves its logo the same way this page
 * does, and so only the whitelisted brand fields ever leave the server.
 */
export default async function InvoicePage({ params }) {
  const { orderNo } = await params;
  const order = await getOrderByOrderNo(orderNo);
  if (!order) notFound();

  const settings = await getInvoiceBrand(await getSiteSettings());

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0 dark:bg-slate-900 dark:print:bg-white">
      {/* The toolbar is a client island, but the sheet stays in the
          server-rendered HTML — the PDF path captures that DOM. */}
      <InvoiceActions orderNo={order.orderNo} />

      <div className="mt-6 flex justify-center px-4 print:mt-0 print:block print:p-0">
        <InvoiceDocument order={order} settings={settings} />
      </div>

      <p className="no-print mt-6 px-4 text-center text-xs text-slate-400 dark:text-slate-500">
        Printing gives selectable, full-quality text. The downloaded PDF is an image of this page.
      </p>
    </div>
  );
}
