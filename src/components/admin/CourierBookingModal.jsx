'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getAvailableCouriers,
  getCourierBooking,
  bookCourier,
  syncCourierStatus,
} from '../../actions/courier';
import CourierStatusBadge from './CourierStatusBadge';

const FACT_LABEL = 'text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400';
const CELL = 'bg-white px-4 py-3.5 dark:bg-slate-900/40';
const DIVIDER = 'gap-px bg-slate-100 dark:bg-slate-700/70';
const PANEL =
  'overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700';

/* Short chips for why a courier can't be picked right now. */
const REASON_CHIP = {
  'credentials pending': 'Credentials pending',
  'disabled in settings': 'Disabled in settings',
  'integration pending': 'Not integrated',
};

/*
 * One tint per courier id (hashed, so custom services from Settings get a
 * colour too) — static class strings, Tailwind only generates what it sees.
 */
const TINTS = [
  'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
  'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
];
function tintFor(id) {
  let hash = 0;
  for (const ch of String(id)) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return TINTS[hash % TINTS.length];
}

function initials(label) {
  const parts = String(label || '?').trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?';
}

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function money(value) {
  const n = Number(value || 0);
  return n.toLocaleString('en-US');
}

/**
 * Popup opened by the "Courier Booking" button on /admin/orders/[orderNo].
 *
 * Only the **courier** is selectable. Everything else (recipient, phone,
 * address, COD, items) is read-only — it is taken straight from the order, so
 * the modal shows it as a summary instead of input fields.
 *
 *   A — not booked: choose courier + read-only parcel summary → Book
 *   B — booked: booking info, courier status badge, Sync, tracking timeline
 */
export default function CourierBookingModal({ order, onClose, onBooked }) {
  const dialogRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [couriers, setCouriers] = useState([]);
  const [provider, setProvider] = useState('steadfast');
  const [booked, setBooked] = useState(null);

  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState(null);
  const [copied, setCopied] = useState(null); // 'tracking' | 'consignment'

  // Load couriers + existing booking; pick the default provider (last used,
  // else the first configured one).
  useEffect(() => {
    let alive = true;
    (async () => {
      const [available, existing] = await Promise.all([
        getAvailableCouriers(),
        getCourierBooking(order.orderNo),
      ]);
      if (!alive) return;
      setCouriers(available);
      if (existing) setBooked(existing);

      let last = null;
      try {
        last = localStorage.getItem('courier:lastProvider');
      } catch {}
      const enabled = available.filter((c) => c.enabled);
      const preferred = enabled.find((c) => c.id === last) || enabled[0];
      setProvider(preferred ? preferred.id : 'steadfast');
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [order.orderNo]);

  // ESC to close + lock background scroll while open.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // Focus the dialog when it opens.
  useEffect(() => {
    const t = setTimeout(() => dialogRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  /* ── Everything sent to the courier is derived from the order ── */
  const payload = useMemo(() => {
    const items = order?.items || [];
    return {
      recipient_name: order?.details?.customerName || '',
      recipient_phone: order?.details?.phoneNumber || '',
      recipient_address: order?.details?.shippingAddress || '',
      cod_amount: Number(order?.total || 0),
      item_description: items
        .map((i) => (i.variantName ? `${i.productTitle} (${i.variantName})` : i.productTitle))
        .join(', ')
        .slice(0, 255),
      total_lot: items.reduce((sum, i) => sum + Number(i.quantity || 0), 0) || 1,
      delivery_type: 0,
    };
  }, [order]);

  /* Read-only facts rendered in the summary (never inputs). */
  const facts = useMemo(() => {
    const items = order?.items || [];
    return {
      items,
      lots: items.reduce((s, i) => s + Number(i.quantity || 0), 0) || 0,
      subtotal: items.reduce((s, i) => s + Number(i.purchasePrice || 0) * Number(i.quantity || 0), 0),
      deliveryCharge: Number(order?.details?.deliveryCharge || 0),
      discount: Number(order?.details?.discount || 0),
      area: order?.details?.shippingArea || '',
      note: order?.details?.orderNote || '',
      recipientName: (order?.details?.customerName || '').trim(),
      recipientPhone: (order?.details?.phoneNumber || '').trim(),
      recipientAddress: (order?.details?.shippingAddress || '').trim(),
      cod: Number(order?.total || 0),
    };
  }, [order]);

  // The server applies the same rules — mirror them so the admin sees the
  // problem before a booking attempt is wasted.
  const issues = useMemo(() => {
    const list = [];
    if (!facts.recipientName) {
      list.push({ field: 'recipient_name', text: 'Recipient name is missing — add it in the Customer card on this order page.' });
    }
    if (!facts.recipientPhone) {
      list.push({ field: 'recipient_phone', text: 'Recipient phone is missing — add it in the Customer card on this order page.' });
    } else if (!/^01\d{9}$/.test(facts.recipientPhone)) {
      list.push({
        field: 'recipient_phone',
        text: `"${facts.recipientPhone}" is not an 11-digit number starting 01 — couriers reject it.`,
      });
    }
    if (!facts.recipientAddress) {
      list.push({ field: 'recipient_address', text: 'Recipient address is missing — add it in the Customer card on this order page.' });
    }
    if (!Number.isFinite(facts.cod) || facts.cod < 0 || facts.cod > 1_000_000) {
      list.push({ field: 'cod_amount', text: `COD amount ৳${facts.cod} is outside the allowed 0 – 1,000,000 range.` });
    }
    return list;
  }, [facts]);

  const selectedCourier = couriers.find((c) => c.id === provider);
  const providerEnabled = Boolean(selectedCourier?.enabled);
  const canSubmit = providerEnabled && !issues.length && !submitting && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await bookCourier(order.orderNo, provider, payload);
      if (res.ok) {
        try {
          localStorage.setItem('courier:lastProvider', provider);
        } catch {}
        const fresh = await getCourierBooking(order.orderNo);
        setBooked(fresh);
        onBooked?.();
      } else if (res.alreadyBooked) {
        // Someone else booked it first — show the booking instead of an error.
        const fresh = await getCourierBooking(order.orderNo);
        if (fresh) {
          setBooked(fresh);
          onBooked?.();
        } else {
          setFormError(res.error || 'Booking failed.');
        }
      } else {
        // Server-side validation comes back keyed by field (there are no
        // inputs here) — flatten it into one readable message.
        const detail = res.fieldErrors ? Object.values(res.fieldErrors).join(' ') : null;
        setFormError(res.error || detail || 'Booking failed.');
      }
    } catch (err) {
      setFormError(err.message || 'Unexpected error — see server logs.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncNote(null);
    try {
      const res = await syncCourierStatus(order.orderNo);
      if (res.ok) {
        setBooked((prev) =>
          prev
            ? {
                ...prev,
                booking: {
                  ...prev.booking,
                  courierStatus: res.courierStatus,
                  lastSyncedAt: res.lastSyncedAt,
                },
                orderStatus: res.orderStatus,
              }
            : prev
        );
        setSyncNote(
          res.changed
            ? { tone: 'ok', text: `Updated — order status is now "${res.orderStatus}".` }
            : {
                tone: 'muted',
                text: res.flag
                  ? `Status "${res.courierStatus}" does not change the order status${res.flag === 'hold' ? ' (parcel on hold — contact support)' : ''}.`
                  : 'No change. Couriers cache status for ~60 seconds.',
              }
        );
        if (res.changed) onBooked?.();
      } else {
        setSyncNote({ tone: 'error', text: res.error || 'Sync failed.' });
      }
    } catch (err) {
      setSyncNote({ tone: 'error', text: err.message || 'Sync failed.' });
    } finally {
      setSyncing(false);
    }
  };

  const copy = async (value, key) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  const booking = booked?.booking;
  const courierLabel = (id, fallback) =>
    couriers.find((c) => c.id === id)?.label || fallback || id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none dark:bg-slate-800"
        role="dialog"
        aria-modal="true"
        aria-label="Courier booking"
      >
        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2f0f6b] text-white shadow-sm dark:bg-[#a78bfa] dark:text-slate-900">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold leading-tight text-slate-900 dark:text-white">
                {booking ? 'Courier booking' : 'Book a parcel'}
              </h3>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                Order #{order.orderNo} · ৳{money(facts.cod)} · {facts.items.length} item
                {facts.items.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-4 px-6 py-6">
              <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="grid gap-2.5 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700/60" />
                ))}
              </div>
              <div className="h-56 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700/60" />
            </div>
          ) : booking ? (
            /* ══ State B — already booked ══ */
            <div className="space-y-5 px-6 py-5">
              {/* Success strip */}
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 dark:border-emerald-500/25 dark:bg-emerald-900/20">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    Booked with {courierLabel(booking.provider)}
                  </p>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                    Created {formatDateTime(booking.createdAt)}
                  </p>
                </div>
                <CourierStatusBadge provider={booking.provider} status={booking.courierStatus} />
              </div>

              {/* Facts */}
              <div className={`${PANEL} bg-slate-100 dark:bg-slate-700/70`}>
                <div className={`grid grid-cols-1 gap-px sm:grid-cols-2 ${DIVIDER}`}>
                  <div className={CELL}>
                    <p className={FACT_LABEL}>Consignment ID</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-slate-900 dark:text-white">
                        {booking.consignmentId}
                      </p>
                      <button
                        onClick={() => copy(booking.consignmentId, 'consignment')}
                        className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                      >
                        {copied === 'consignment' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className={CELL}>
                    <p className={FACT_LABEL}>Tracking code</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-slate-900 dark:text-white">
                        {booking.trackingCode || '—'}
                      </p>
                      {booking.trackingCode && (
                        <button
                          onClick={() => copy(booking.trackingCode, 'tracking')}
                          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                        >
                          {copied === 'tracking' ? 'Copied!' : 'Copy'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={CELL}>
                    <p className={FACT_LABEL}>Order status</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{booked.orderStatus}</p>
                  </div>
                  <div className={CELL}>
                    <p className={FACT_LABEL}>Last synced</p>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{formatDateTime(booking.lastSyncedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {booking.trackingLink && (
                  <a
                    href={booking.trackingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f0f6b] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2f0f6b]/90 dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90"
                  >
                    Track parcel
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  {syncing && (
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {syncing ? 'Syncing…' : 'Sync status'}
                </button>
                <button
                  onClick={onClose}
                  className="ml-auto rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                >
                  Close
                </button>
              </div>

              {syncNote && (
                <p
                  className={`text-xs font-medium ${
                    syncNote.tone === 'error'
                      ? 'text-red-500'
                      : syncNote.tone === 'ok'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {syncNote.text}
                </p>
              )}

              {/* Tracking timeline */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                <h4 className={FACT_LABEL}>Tracking history</h4>
                {booked.timelineError ? (
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{booked.timelineError}</p>
                ) : booked.timeline?.length ? (
                  <ol className="mt-3 space-y-4 border-l border-slate-200 pl-4 dark:border-slate-700">
                    {[...booked.timeline]
                      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
                      .map((t, i) => (
                        <li key={i} className="relative">
                          <span
                            className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ring-4 ring-slate-50 dark:ring-slate-900/40 ${
                              i === 0 ? 'bg-[#2f0f6b] dark:bg-[#a78bfa]' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                          />
                          <p className="text-sm text-slate-700 dark:text-slate-300">{t.text}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{formatDateTime(t.createdAt)}</p>
                        </li>
                      ))}
                  </ol>
                ) : (
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">No tracking steps yet.</p>
                )}
              </div>
            </div>
          ) : (
            /* ══ State A — pick courier, review, book ══ */
            <form id="courier-book-form" onSubmit={handleSubmit} className="space-y-6 px-6 py-5">
              {/* Step 1 — courier */}
              <section>
                <StepTitle step={1} title="Choose a courier" hint="The only thing you pick here." />
                <div
                  role="radiogroup"
                  aria-label="Choose a courier"
                  className="mt-3 grid gap-2.5 sm:grid-cols-3"
                >
                  {couriers.map((c) => {
                    const isSelected = provider === c.id;
                    const disabled = !c.enabled || submitting;
                    return (
                      <label key={c.id} className="relative block">
                        <input
                          type="radio"
                          name="courier-provider"
                          value={c.id}
                          checked={isSelected}
                          disabled={disabled}
                          onChange={() => {
                            setProvider(c.id);
                            setFormError(null);
                          }}
                          className="peer sr-only"
                        />
                        <div
                          className={[
                            'flex h-full cursor-pointer flex-col gap-2.5 rounded-xl border bg-white p-3.5 transition dark:bg-slate-900/40',
                            'peer-focus-visible:ring-2 peer-focus-visible:ring-[#2f0f6b]/50 dark:peer-focus-visible:ring-[#a78bfa]/60',
                            disabled
                              ? 'cursor-not-allowed border-dashed border-slate-200 opacity-60 dark:border-slate-700'
                              : 'border-slate-200 hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:hover:border-slate-600',
                            isSelected
                              ? 'border-[#2f0f6b] ring-1 ring-[#2f0f6b] shadow-sm dark:border-[#a78bfa] dark:ring-[#a78bfa]'
                              : '',
                          ].join(' ')}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${tintFor(c.id)}`}
                              aria-hidden="true"
                            >
                              {initials(c.label)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {c.label}
                              </span>
                              <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                                {c.enabled ? 'Ready to book' : REASON_CHIP[c.reason] || 'Unavailable'}
                              </span>
                            </span>
                            <span
                              aria-hidden="true"
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                                isSelected
                                  ? 'border-[#2f0f6b] bg-[#2f0f6b] text-white dark:border-[#a78bfa] dark:bg-[#a78bfa] dark:text-slate-900'
                                  : 'border-slate-300 dark:border-slate-600'
                              }`}
                            >
                              {isSelected && (
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {!couriers.length && (
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">No courier services found.</p>
                )}
                {couriers.length > 0 && !providerEnabled && (
                  <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                    Pick an available courier to continue.
                  </p>
                )}
              </section>

              {/* Step 2 — read-only parcel summary */}
              <section>
                <StepTitle
                  step={2}
                  title="Parcel details"
                  hint="Taken from this order — not editable here."
                />
                <div className={`${PANEL} mt-3 bg-slate-100 dark:bg-slate-700/70`}>
                  {/* Quick facts */}
                  <div className={`grid grid-cols-2 gap-px sm:grid-cols-4 ${DIVIDER}`}>
                    <div className={CELL}>
                      <p className={FACT_LABEL}>Invoice</p>
                      <p className="mt-1 truncate font-mono text-sm font-semibold text-slate-900 dark:text-white">
                        {order.orderNo}
                      </p>
                    </div>
                    <div className={CELL}>
                      <p className={FACT_LABEL}>COD amount</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                        ৳{money(facts.cod)}
                        {facts.cod === 0 && <span className="ml-1 font-normal text-slate-400">prepaid</span>}
                      </p>
                    </div>
                    <div className={CELL}>
                      <p className={FACT_LABEL}>Lots</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{payload.total_lot}</p>
                    </div>
                    <div className={CELL}>
                      <p className={FACT_LABEL}>Delivery</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Home</p>
                    </div>
                  </div>

                  {/* Recipient */}
                  <div className={`border-t border-slate-100 p-4 dark:border-slate-700/70 ${CELL}`}>
                    <p className={FACT_LABEL}>Recipient</p>
                    <div className="mt-2 flex items-start gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tintFor(
                          facts.recipientName || 'x'
                        )}`}
                        aria-hidden="true"
                      >
                        {initials(facts.recipientName || '?')}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {facts.recipientName || <span className="font-normal text-red-500">Name missing</span>}
                        </p>
                        <p className="mt-0.5 break-all text-sm text-slate-600 dark:text-slate-300">
                          {facts.recipientPhone || <span className="text-red-500">Phone missing</span>}
                          {facts.area && <span className="text-slate-400 dark:text-slate-500"> · {facts.area}</span>}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                          {facts.recipientAddress || <span className="text-red-500">Address missing</span>}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  {facts.items.length > 0 && (
                    <div className={`border-t border-slate-100 p-4 dark:border-slate-700/70 ${CELL}`}>
                      <p className={FACT_LABEL}>
                        Items ({facts.items.length})
                      </p>
                      <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-700/70">
                        {facts.items.map((i) => (
                          <li key={i.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                            <span className="min-w-0 truncate text-slate-700 dark:text-slate-300">
                              {i.productTitle}
                              {i.variantName && (
                                <span className="text-slate-400 dark:text-slate-500"> ({i.variantName})</span>
                              )}
                            </span>
                            <span className="shrink-0 whitespace-nowrap text-slate-500 dark:text-slate-400">
                              × {i.quantity}
                              <span className="ml-2 font-medium text-slate-700 dark:text-slate-300">
                                ৳{money(Number(i.purchasePrice || 0) * Number(i.quantity || 0))}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Totals */}
                  <div className={`border-t border-slate-100 dark:border-slate-700/70 ${CELL}`}>
                    <dl className="space-y-1 text-sm">
                      <TotalRow label="Subtotal" value={`৳${money(facts.subtotal)}`} />
                      <TotalRow label="Delivery charge" value={`৳${money(facts.deliveryCharge)}`} />
                      {facts.discount > 0 && <TotalRow label="Discount" value={`− ৳${money(facts.discount)}`} />}
                      <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-1.5 dark:border-slate-700">
                        <dt className="text-sm font-semibold text-slate-900 dark:text-white">Order total</dt>
                        <dd className="text-sm font-bold text-slate-900 dark:text-white">৳{money(facts.cod)}</dd>
                      </div>
                    </dl>
                  </div>

                  {facts.note && (
                    <div className={`border-t border-slate-100 dark:border-slate-700/70 ${CELL}`}>
                      <p className={FACT_LABEL}>Admin note</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{facts.note}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Read-only validation */}
              {issues.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-900/20">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Fix on the order page first
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {issues.map((i) => (
                      <li key={i.field + i.text} className="text-sm text-amber-800 dark:text-amber-300">
                        • {i.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300">
                  {formError}
                </div>
              )}
            </form>
          )}
        </div>

        {/* ── Footer ── */}
        {!loading && !booking && (
          <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="flex shrink-0 justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="courier-book-form"
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2f0f6b] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#2f0f6b]/90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90"
                >
                  {submitting && (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {submitting ? 'Booking…' : `Book with ${selectedCourier?.label || 'courier'}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepTitle({ step, title, hint }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2f0f6b]/10 text-[11px] font-bold text-[#2f0f6b] dark:bg-[#a78bfa]/15 dark:text-[#a78bfa]">
        {step}
      </span>
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h4>
      {hint && (
        <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">{hint}</span>
      )}
    </div>
  );
}

function TotalRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-slate-700 dark:text-slate-300">{value}</dd>
    </div>
  );
}
