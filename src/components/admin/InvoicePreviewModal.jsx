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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Invoice for order ${order.orderNo}`}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-fade-in sm:rounded-2xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2f0f6b]/10 text-[#2f0f6b] dark:bg-[#a78bfa]/15 dark:text-[#a78bfa]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Invoice</h3>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                INV-{order.orderNo} · {order.details?.customerName || '—'}
              </p>
            </div>
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
            <div className="overflow-hidden rounded-lg shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
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
