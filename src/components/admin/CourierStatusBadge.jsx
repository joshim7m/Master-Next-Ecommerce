'use client';

import { courierStatusLabel, courierStatusTone } from '../../lib/courierStatus';

/*
 * Literal Tailwind class strings per tone — Tailwind only generates classes it
 * sees in source, so the map must be static, never constructed at runtime.
 */
const TONES = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-400/30',
  red: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-400/30',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-400/30',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-400/30',
  purple: 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-900/30 dark:text-purple-400 dark:ring-purple-400/30',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-900/30 dark:text-indigo-400 dark:ring-indigo-400/30',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-700/60 dark:text-slate-300 dark:ring-slate-400/30',
};

const DOTS = {
  emerald: 'bg-emerald-500',
  red: 'bg-red-500',
  amber: 'bg-amber-400',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  indigo: 'bg-indigo-500',
  slate: 'bg-slate-400',
};

/**
 * Badge for a courier's RAW status (`courierStatus`), labelled through
 * courierStatus.js so the modal and the order card always agree.
 */
export default function CourierStatusBadge({ provider, status, className = '' }) {
  const tone = courierStatusTone(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOTS[tone]}`} />
      {courierStatusLabel(provider, status)}
    </span>
  );
}
