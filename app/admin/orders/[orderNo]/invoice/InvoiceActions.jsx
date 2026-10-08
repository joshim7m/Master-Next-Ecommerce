'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Print / download controls for the invoice page.
 *
 * Both output paths are kept deliberately. Print produces vector, selectable
 * text at the browser's own quality; Download rasterises the same DOM, which is
 * the only way to get a one-click file with correct Bengali (see
 * src/lib/invoicePdf.js for why a PDF library cannot shape the text itself).
 *
 * Isolated in its own component so the Suspense boundary that useSearchParams
 * requires wraps only the toolbar — the invoice sheet itself must never be
 * inside a `fallback={null}` boundary, or it would be absent from the
 * server-rendered HTML.
 */
export default function InvoiceActions({ orderNo }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Arrive from the order page's button → open the print dialog immediately.
  // A manual visit of this URL leaves the dialog alone.
  useEffect(() => {
    if (searchParams.get('autoprint') !== '1') return;
    // A beat so fonts and layout settle before the dialog captures them.
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [searchParams]);

  const handleDownload = useCallback(async () => {
    setGenerating(true);
    setError('');
    try {
      // Scoped to the sheet rather than the document, so the toolbar is never
      // baked into the captured image.
      const sheet = document.querySelector('.invoice-sheet');
      if (!sheet) throw new Error('Invoice sheet not found');
      const { buildInvoicePdf, downloadBlob } = await import('../../../../../src/lib/invoicePdf');
      const blob = await buildInvoicePdf(sheet);
      downloadBlob(blob, `invoice-${orderNo}.pdf`);
    } catch (e) {
      setError(e?.message || 'Could not generate the PDF.');
    }
    setGenerating(false);
  }, [orderNo]);

  return (
    <div className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <span className="text-sm text-slate-500 dark:text-slate-400">Invoice INV-{orderNo}</span>
        </div>

        <div className="flex items-center gap-2">
          {error ? (
            <span className="text-xs font-medium text-red-600 dark:text-red-400">{error}</span>
          ) : null}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
            </svg>
            Print
          </button>
          <button
            onClick={handleDownload}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f0f6b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2f0f6b]/90 disabled:opacity-50"
          >
            {generating ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
            )}
            {generating ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
