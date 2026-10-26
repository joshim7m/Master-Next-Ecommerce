'use client';

import Link from 'next/link';
import InvoiceDocument from './InvoiceDocument';

/**
 * Invoice preview modal for the orders list.
 *
 * Shows the same sheet the A4 invoice page prints, in `compact` mode — the
 * page box is dropped so it fits a modal, but nothing is removed: items,
 * delivery, discount and grand total are all there. The modal is a preview,
 * not a document, so the footer points at the printable page for that.
 *
 * `data` is the payload of /api/admin/orders/invoice-preview:
 * `{ order, settings }`, where `settings` holds only the brand fields.
 */
export default function InvoicePreviewModal({ order, data, loading, error, onClose }) {
  if (!order) return null;

  const statusColors = {
    pending: { pill: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
    processing: { pill: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500' },
    completed: { pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
    cancelled: { pill: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500' },
    return: { pill: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', dot: 'bg-purple-500' },
    incomplete: { pill: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300', dot: 'bg-slate-400' },
  };
  const status = statusColors[order.orderStatus] || statusColors.incomplete;
  const statusLabel =
    { pending: 'Pending', processing: 'Processing', completed: 'Completed', cancelled: 'Cancel', return: 'Return', incomplete: 'Incomplete' }[
      order.orderStatus
    ] || order.orderStatus;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Invoice for order ${order.orderNo}`}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-fade-in sm:rounded-2xl dark:bg-slate-800 dark:ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-purple-50/70 via-white to-white px-5 py-4 dark:border-slate-700 dark:from-purple-950/40 dark:via-slate-800 dark:to-slate-800">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2f0f6b] to-[#6d3fbf] text-white shadow-md">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h6l4 4v11a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  Invoice INV-{order.orderNo}
                </h3>
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${status.pill}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  {statusLabel}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {order.details?.customerName || '—'}
                {order.details?.phoneNumber ? ` · ${order.details.phoneNumber}` : ''}
              </p>
              {order.details?.orderNote && (
                <p className="mt-0.5 flex items-start gap-1 text-xs text-orange-500 dark:text-orange-400">
                  <svg className="mt-0.5 h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2zM7 9h10M7 13h6" />
                  </svg>
                  <span className="whitespace-normal break-words">{order.details.orderNote}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-2 sm:gap-3">
            <div className="hidden rounded-lg bg-slate-50 px-3 py-1.5 text-right ring-1 ring-slate-200/70 sm:block dark:bg-slate-900/60 dark:ring-slate-700">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Total</p>
              <p className="text-sm font-bold leading-tight text-slate-900 dark:text-white">৳{Number(order.total).toLocaleString()}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close invoice"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-3 sm:p-4 dark:bg-slate-900/60">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#2f0f6b] dark:border-slate-700 dark:border-t-[#a78bfa]" />
              <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">Loading invoice…</p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          ) : data ? (
            <div className="overflow-hidden rounded-lg shadow-[0_10px_40px_-10px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/80 dark:ring-slate-700">
              <InvoiceDocument order={data.order} settings={data.settings} compact />
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 dark:border-slate-700">
          <p className="text-xs text-slate-400 dark:text-slate-500">Preview only — for a printable copy use the invoice page.</p>
          <Link
            href={`/admin/orders/${order.orderNo}/invoice`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Open printable invoice
          </Link>
        </div>
      </div>
    </div>
  );
}
