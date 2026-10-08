/**
 * A4 invoice. Pure presentational — no fetching, no 'use client'.
 *
 * Renders for on-screen viewing *and* for print. The Print path is the
 * high-fidelity one: the browser shapes the Bengali text, so the PDF keeps real
 * selectable glyphs. The raster download (src/lib/invoicePdf.js) captures this
 * same DOM, which is why the sheet is one self-contained block.
 *
 * Bangla labels are primary with a small English line beneath. Never render
 * secrets from SiteSetting (jwtSecret, telegramBotToken, telegramChatId) —
 * only the whitelisted brand fields below.
 */

const BRAND = '#2f0f6b';
const INK = '#201144';
const MUTED = '#6b6480';
const LINE = '#e6e2ef';

const STATUS_COLORS = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  processing: { bg: '#dbeafe', text: '#1d4ed8' },
  completed: { bg: '#d1fae5', text: '#047857' },
  cancelled: { bg: '#fee2e2', text: '#b91c1c' },
  return: { bg: '#ede9fe', text: '#6d28d9' },
  incomplete: { bg: '#f1f5f9', text: '#475569' },
};

const money = (v) => `৳${Number(v || 0).toLocaleString('en-US')}`;

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/** Bangla label with English underneath. */
function Label({ bn, en }) {
  return (
    <div>
      <p className="font-bangla text-[13px] font-semibold leading-tight" style={{ color: INK }}>{bn}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>{en}</p>
    </div>
  );
}

export default function InvoiceDocument({ order, settings = {} }) {
  if (!order) return null;

  const details = order.details || {};
  const items = order.items || [];
  const subtotal = items.reduce((s, i) => s + Number(i.purchasePrice) * i.quantity, 0);
  const deliveryCharge = Number(details.deliveryCharge || 0);
  const discount = Number(details.discount || 0);
  const total = Number(order.total || 0);

  const siteName = settings.siteName || 'Store';
  const status = STATUS_COLORS[order.orderStatus] || STATUS_COLORS.incomplete;

  return (
    <div
      className="invoice-sheet relative mx-auto bg-white text-[13px]"
      style={{ width: '210mm', minHeight: '297mm', padding: '14mm 14mm 16mm', color: INK }}
    >
      {/* Cancelled orders get a watermark so a printed copy can't be mistaken for live */}
      {order.orderStatus === 'cancelled' && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <span
            className="font-bangla text-[64px] font-bold"
            style={{ color: 'rgba(185, 28, 28, 0.08)', transform: 'rotate(-30deg)' }}
          >
            বাতিল · CANCELLED
          </span>
        </div>
      )}

      <div className="relative">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-6 border-b-2 pb-4" style={{ borderColor: BRAND }}>
          <div className="flex items-center gap-3">
            {settings.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logo} alt={siteName} className="h-14 w-auto object-contain" />
            ) : null}
            <div>
              <h1 className="text-xl font-bold leading-tight" style={{ color: BRAND }}>{siteName}</h1>
              {settings.address ? (
                <p className="mt-1 max-w-[70mm] text-[11px] leading-relaxed" style={{ color: MUTED }}>
                  {settings.address}
                </p>
              ) : null}
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px]" style={{ color: MUTED }}>
                {settings.mobile ? <span>📞 {settings.mobile}</span> : null}
                {settings.email ? <span>✉ {settings.email}</span> : null}
                {settings.siteUrl ? <span>{settings.siteUrl}</span> : null}
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="font-bangla text-lg font-bold leading-tight" style={{ color: INK }}>
              ইনভয়েস
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>Invoice</p>
            <p className="mt-2 text-base font-bold" style={{ color: BRAND }}>INV-{order.orderNo}</p>
          </div>
        </div>

        {/* ── Meta strip ── */}
        <div className="flex flex-wrap justify-between gap-4 border-b py-3" style={{ borderColor: LINE }}>
          <div className="flex gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>Date</p>
              <p className="mt-0.5 font-semibold">{formatDate(order.createdAt)}</p>
              <p className="text-[11px]" style={{ color: MUTED }}>{formatTime(order.createdAt)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>Order No</p>
              <p className="mt-0.5 font-semibold">#{order.orderNo}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>Status</p>
            <span
              className="mt-0.5 inline-block rounded-full px-3 py-0.5 text-[11px] font-bold uppercase"
              style={{ background: status.bg, color: status.text }}
            >
              {order.orderStatus}
            </span>
          </div>
        </div>

        {/* ── Customer + delivery ── */}
        <div className="grid grid-cols-2 gap-6 border-b py-4" style={{ borderColor: LINE }}>
          <div>
            <Label bn="গ্রাহকের তথ্য" en="Customer" />
            <div className="mt-2 space-y-1 text-[12px] leading-relaxed">
              <p className="font-semibold">{details.customerName || '—'}</p>
              {details.phoneNumber ? <p style={{ color: MUTED }}>📞 {details.phoneNumber}</p> : null}
              {details.shippingAddress ? <p style={{ color: MUTED }}>{details.shippingAddress}</p> : null}
              {details.shippingArea ? <p style={{ color: MUTED }}>{details.shippingArea}</p> : null}
            </div>
          </div>
          <div>
            <Label bn="ডেলিভারি তথ্য" en="Delivery" />
            <div className="mt-2 space-y-1 text-[12px] leading-relaxed">
              <p><span style={{ color: MUTED }}>Charge: </span>{deliveryCharge > 0 ? money(deliveryCharge) : 'Free'}</p>
              <p><span style={{ color: MUTED }}>Payment: </span>Cash on delivery</p>
              <p><span style={{ color: MUTED }}>Items: </span>{items.length}</p>
            </div>
          </div>
        </div>

        {/* ── Items ── */}
        <table className="invoice-table w-full border-collapse py-3 text-[12px]">
          <thead>
            <tr style={{ background: '#f7f5fa' }}>
              <th className="border-b px-2 py-2 text-left font-semibold" style={{ borderColor: LINE, color: INK }}>#</th>
              <th className="border-b px-2 py-2 text-left font-semibold" style={{ borderColor: LINE, color: INK }}>
                <span className="font-bangla">পণ্য</span>
                <span className="ml-1 text-[10px] font-normal uppercase tracking-wider" style={{ color: MUTED }}>Product</span>
              </th>
              <th className="border-b px-2 py-2 text-left font-semibold" style={{ borderColor: LINE, color: INK }}>SKU</th>
              <th className="border-b px-2 py-2 text-center font-semibold" style={{ borderColor: LINE, color: INK }}>Qty</th>
              <th className="border-b px-2 py-2 text-right font-semibold" style={{ borderColor: LINE, color: INK }}>Price</th>
              <th className="border-b px-2 py-2 text-right font-semibold" style={{ borderColor: LINE, color: INK }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className="invoice-row">
                <td className="border-b px-2 py-2" style={{ borderColor: LINE, color: MUTED }}>{idx + 1}</td>
                <td className="border-b px-2 py-2" style={{ borderColor: LINE }}>
                  <div className="flex items-center gap-2">
                    {item.itemImagePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.itemImagePath}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded border object-cover"
                        style={{ borderColor: LINE }}
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="font-medium leading-snug">{item.productTitle}</p>
                      {item.variantName ? (
                        <p className="text-[11px]" style={{ color: MUTED }}>{item.variantName}</p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="border-b px-2 py-2 font-mono text-[11px]" style={{ borderColor: LINE, color: MUTED }}>
                  {item.sku || '—'}
                </td>
                <td className="border-b px-2 py-2 text-center" style={{ borderColor: LINE }}>{item.quantity}</td>
                <td className="border-b px-2 py-2 text-right" style={{ borderColor: LINE }}>{money(item.purchasePrice)}</td>
                <td className="border-b px-2 py-2 text-right font-semibold" style={{ borderColor: LINE }}>
                  {money(Number(item.purchasePrice) * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Totals ── */}
        <div className="flex justify-end py-4">
          <div className="w-[85mm] space-y-1.5 text-[12px]">
            <div className="flex justify-between">
              <span style={{ color: MUTED }}>Subtotal</span>
              <span className="font-medium">{money(subtotal)}</span>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between">
                <span style={{ color: MUTED }}>Discount</span>
                <span className="font-medium" style={{ color: '#047857' }}>−{money(discount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span style={{ color: MUTED }}>Delivery</span>
              <span className="font-medium">{deliveryCharge > 0 ? money(deliveryCharge) : 'Free'}</span>
            </div>
            <div
              className="flex justify-between border-t pt-2 text-base"
              style={{ borderColor: BRAND }}
            >
              <span className="font-bold">
                <span className="font-bangla">সর্বমোট</span>
                <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
                  Grand Total
                </span>
              </span>
              <span className="font-bold" style={{ color: BRAND }}>{money(total)}</span>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="mt-auto border-t pt-3 text-center text-[11px]"
          style={{ borderColor: LINE, color: MUTED }}
        >
          <p className="font-bangla text-[13px] font-medium" style={{ color: INK }}>
            ধন্যবাদ — আপনার অর্ডারের জন্য আপনাকে ধন্যবাদ।
          </p>
          <p className="mt-0.5">Thank you for your order.</p>
          {settings.copyrightText ? <p className="mt-1.5">{settings.copyrightText}</p> : null}
        </div>
      </div>
    </div>
  );
}
