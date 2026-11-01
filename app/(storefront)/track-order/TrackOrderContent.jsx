'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Headset,
  Package,
  PackageSearch,
  RotateCcw,
  Search,
  Truck,
  XCircle,
  Ban,
} from 'lucide-react';
import { getOrderSummary, findOrdersByPhone, trackOrder } from '../../../src/actions/trackOrder';
import { courierStatusLabel } from '../../../src/lib/courierStatus';

/*
 * Storefront order tracking with ONE input: the customer types either the
 * order number or the mobile number they ordered with.
 *   - 6 digits            → order-number summary; full itemized details need
 *                           the matching mobile number (inline verify step).
 *   - 10+ digits (01/880) → the recent orders placed with that phone.
 */

/** The raw order status shown verbatim in customer-facing pills. */
const STATUS_META = {
  pending: {
    label: 'Pending',
    pill: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-900/40',
  },
  in_review: {
    label: 'In Review',
    pill: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:ring-sky-900/40',
  },
  hold: {
    label: 'On Hold',
    pill: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:ring-orange-900/40',
  },
  follow_up: {
    label: 'Follow Up',
    pill: 'bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:ring-cyan-900/40',
  },
  in_courier: {
    label: 'In Courier',
    pill: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-900/40',
  },
  processing: {
    label: 'Processing',
    pill: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:ring-indigo-900/40',
  },
  completed: {
    label: 'Completed',
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-900/40',
  },
  return: {
    label: 'Return',
    pill: 'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:ring-purple-900/40',
  },
  cancelled: {
    label: 'Cancelled',
    pill: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-900/40',
  },
  blocked: {
    label: 'Blocked',
    pill: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:ring-rose-900/40',
  },
};

/**
 * The three milestones a customer cares about — everything else is a working
 * state of the first one. Return/cancelled/blocked get a banner instead.
 */
const STAGES = [
  {
    label: 'Order Placed',
    sub: 'We received your order and are preparing the parcel.',
    statuses: ['pending', 'in_review', 'processing', 'hold', 'follow_up'],
  },
  {
    label: 'In Courier',
    sub: 'Your parcel is with our courier partner, out for delivery.',
    statuses: ['in_courier'],
  },
  {
    label: 'Delivered',
    sub: 'Delivered — thank you for shopping with us.',
    statuses: ['completed'],
  },
];

const EXCEPTION_BANNERS = {
  cancelled: {
    icon: XCircle,
    title: 'Order Cancelled',
    tone: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400',
    text: 'This order was cancelled. If this is unexpected, please reach out to us.',
  },
  return: {
    icon: RotateCcw,
    title: 'Parcel Returned',
    tone: 'border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-900/40 dark:bg-purple-900/20 dark:text-purple-400',
    text: 'The courier returned this parcel. Our team will contact you about a refund or a re-shipment.',
  },
  blocked: {
    icon: Ban,
    title: 'Order Blocked',
    tone: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-400',
    text: 'This order is currently blocked — please contact our support team.',
  },
};

/** The current stage index (0-2), or -1 for the banner-handled statuses. */
function stageIndexOf(status) {
  return STAGES.findIndex((stage) => stage.statuses.includes(status));
}

const money = (value) => `৳${Number(value || 0).toLocaleString('en-BD')}`;

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const PROVIDER_LABEL = { steadfast: 'Steadfast', pathao: 'Pathao', redx: 'RedX' };

const INPUT_CLASS =
  'block w-full rounded-xl border border-border bg-white py-3.5 pl-11 pr-4 text-sm text-on-surface placeholder:text-muted/50 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:placeholder:text-dark-muted/50 dark:focus:border-primary dark:focus:ring-primary/20';

const CARD_CLASS =
  'rounded-2xl border border-border bg-white shadow-ambient dark:border-dark-border dark:bg-dark-card';

const SECTION_CARD_CLASS =
  'rounded-2xl border border-border bg-white p-5 shadow-ambient dark:border-dark-border dark:bg-dark-card sm:p-6';

const STAGE_ICONS = [Package, Truck, CircleCheck];

/** WhatsApp brand glyph — lucide dropped brand icons, so it ships inline. */
function WhatsAppIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/** How we split one input between the two lookup paths. */
function classifyQuery(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length >= 6 && digits.length < 10) return 'order'; // orderNo is 6 digits
  if (digits.length >= 10) return 'phone'; // 01XXXXXXXXX (and +880 variants)
  return 'invalid';
}

export default function TrackOrderContent({ siteName = '', supportPhone = '' }) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // 'invalid' | 'not_found'
  const [lookupKind, setLookupKind] = useState(null);
  const [summary, setSummary] = useState(null); // order-number-only result
  const [orders, setOrders] = useState(null); // phone-number list result
  const [order, setOrder] = useState(null); // full detail render
  const [detailFor, setDetailFor] = useState(null); // orderNo currently open
  const [detailLoading, setDetailLoading] = useState(false);

  // `/track-order?orderNo=...` (linked from the thank-you page) prefills the
  // order number so one tap on the button pulls the summary up.
  useEffect(() => {
    const prefill = (searchParams.get('orderNo') || '').replace(/\D/g, '').slice(0, 12);
    if (prefill) setQuery(prefill);
  }, [searchParams]);

  // wa.me wants the international form with no "+", e.g. 8801XXXXXXXXX.
  const waNumber = (() => {
    const digits = String(supportPhone).replace(/\D/g, '');
    if (!digits) return '';
    return digits.startsWith('880') ? digits : `880${digits.replace(/^0+/, '')}`;
  })();

  const reset = () => {
    setQuery('');
    setError(null);
    setSummary(null);
    setOrders(null);
    setOrder(null);
    setDetailFor(null);
    setLookupKind(null);
  };

  /** Load the full (phone-verified) detail for one order. */
  const loadDetail = async (orderNo, phoneDigits) => {
    setDetailLoading(true);
    setError(null);
    try {
      const result = await trackOrder(orderNo, phoneDigits);
      if (result.ok) {
        setOrder(result.order);
        setDetailFor(orderNo);
      } else {
        setError(result.error || 'not_found');
      }
    } catch {
      setError('not_found');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setOrder(null);
    setDetailFor(null);
    setSummary(null);
    setOrders(null);
    setError(null);

    const kind = classifyQuery(query);
    setLookupKind(kind);
    if (kind === 'invalid') {
      setError('invalid');
      return;
    }

    setLoading(true);
    try {
      if (kind === 'order') {
        const result = await getOrderSummary(query.trim());
        if (result.ok) setSummary(result.order);
        else setError('not_found');
      } else {
        const result = await findOrdersByPhone(query.trim());
        if (result.ok && result.orders.length > 0) {
          setOrders(result.orders);
          // With exactly one order, skip the list and go straight to details —
          // the customer already typed the phone that owns it.
          if (result.orders.length === 1) {
            setDetailLoading(true);
            const detail = await trackOrder(result.orders[0].orderNo, query.trim());
            setDetailLoading(false);
            if (detail.ok) {
              setOrder(detail.order);
              setDetailFor(result.orders[0].orderNo);
            } else {
              setError('not_found');
            }
          }
        } else if (result.ok) {
          setError('not_found');
        } else {
          setError('invalid');
        }
      }
    } catch {
      setError('not_found');
    } finally {
      setLoading(false);
    }
  };

  /** The status pill, reused across cards. */
  const StatusPill = ({ status }) => {
    const meta = STATUS_META[status];
    if (!meta) return null;
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 ${meta.pill}`}
      >
        <CircleCheck className="h-3.5 w-3.5" />
        {meta.label}
      </span>
    );
  };

  /** Journey card (stepper) + exception banner for a full-detail order. */
  const JourneyBlock = ({ status }) => {
    const bannerData = EXCEPTION_BANNERS[status];
    const stageIndex = stageIndexOf(status);

    if (bannerData) {
      return (
        <div className={`flex items-start gap-3 rounded-2xl border p-5 ${bannerData.tone}`}>
          <bannerData.icon className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{bannerData.title}</p>
            <p className="mt-0.5 text-sm opacity-90">{bannerData.text}</p>
          </div>
        </div>
      );
    }
    if (stageIndex < 0) return null;

    return (
      <div className={SECTION_CARD_CLASS}>
        <p className="font-label-caps text-[0.65rem] tracking-[0.15em] text-muted dark:text-dark-muted">
          Delivery Journey
        </p>

        {/* Vertical timeline — mobile */}
        <div className="relative mt-4 sm:hidden">
          <div className="absolute bottom-3 left-[1.125rem] top-3 w-0.5 rounded-full bg-border dark:bg-dark-border" />
          <div className="relative space-y-5">
            {STAGES.map((s, i) => {
              const done = i < stageIndex;
              const current = i === stageIndex;
              const Icon = STAGE_ICONS[i];
              return (
                <div key={s.label} className="flex items-start gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm transition-colors duration-500 ${
                      current || done
                        ? 'bg-primary text-on-primary ring-4 ring-primary/20'
                        : 'bg-warm-sand text-muted dark:bg-slate-700/60 dark:text-dark-muted'
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 pt-1">
                    <p
                      className={`text-sm font-semibold ${
                        current
                          ? 'text-primary dark:text-primary'
                          : done
                            ? 'text-on-surface dark:text-dark-text'
                            : 'text-muted dark:text-dark-muted'
                      }`}
                    >
                      {s.label}
                      {current && (
                        <span className="ml-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wider text-primary dark:text-primary">
                          Now
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-muted dark:text-dark-muted">{s.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Horizontal stepper — sm and up */}
        <div className="relative mt-6 hidden sm:block">
          {/* rail — spans from the first to the last circle center (16.7%→83.3% of the row) */}
          <div className="absolute left-[16.7%] right-[16.7%] top-[calc(1.25rem-1px)] h-0.5 rounded-full bg-border dark:bg-dark-border" />
          <div
            className="absolute left-[16.7%] top-[calc(1.25rem-1px)] h-0.5 rounded-full bg-primary transition-all duration-500 dark:bg-primary"
            style={{ width: `${Math.min(stageIndex, 2) * 33.3}%` }}
          />
          <div className="relative grid grid-cols-3">
            {STAGES.map((s, i) => {
              const done = i < stageIndex;
              const current = i === stageIndex;
              const Icon = STAGE_ICONS[i];
              return (
                <div key={s.label} className="flex flex-col items-center gap-2 text-center">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition-colors duration-500 ${
                      current || done
                        ? 'bg-primary text-on-primary ring-4 ring-primary/20'
                        : 'bg-warm-sand text-muted dark:bg-slate-700/60 dark:text-dark-muted'
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-[18px] w-[18px]" />}
                  </span>
                  <span
                    className={`px-1 text-xs font-medium ${
                      current
                        ? 'font-bold text-primary dark:text-primary'
                        : done
                          ? 'text-on-surface dark:text-dark-text'
                          : 'text-muted dark:text-dark-muted'
                    }`}
                  >
                    {s.label}
                  </span>
                  <span className="px-1 text-[11px] leading-snug text-muted dark:text-dark-muted">{s.sub}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  /** Courier tracking card shared by every result kind. */
  const CourierCard = ({ courier }) =>
    courier ? (
      <div className={SECTION_CARD_CLASS}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 text-primary">
              <Truck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-on-surface dark:text-dark-text">
                Courier — {PROVIDER_LABEL[courier.provider] || courier.provider}
              </p>
              <p className="mt-0.5 text-xs text-muted dark:text-dark-muted">
                Status: {courierStatusLabel(courier.provider, courier.courierStatus)}
                {courier.trackingCode || courier.consignmentId ? ' · ID: ' : ''}
                <span className="font-medium">{courier.trackingCode || courier.consignmentId}</span>
              </p>
            </div>
          </div>
          {courier.trackingLink ? (
            <a
              href={courier.trackingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white transition hover:bg-primary/90 dark:bg-primary dark:text-white"
            >
              Track at courier
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      </div>
    ) : null;

  /** The full (phone-verified) order detail — journey, courier, items, totals. */
  const FullDetail = ({ data, fromList }) => (
    <div className="mt-6 space-y-4 animate-fade-in sm:mt-8 sm:space-y-5">
      {fromList && (
        <button
          type="button"
          onClick={() => setOrder(null)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-primary dark:text-dark-muted dark:hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to your orders
        </button>
      )}

      <div className={SECTION_CARD_CLASS}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-label-caps text-[0.65rem] tracking-[0.15em] text-muted dark:text-dark-muted">
              Order Number
            </p>
            <p className="font-display text-xl font-bold text-on-surface dark:text-dark-text sm:text-2xl">
              #{data.orderNo}
            </p>
            <p className="mt-1 text-xs text-muted dark:text-dark-muted">
              Placed on {fmtDate(data.createdAt)}
              {data.customerName ? ` · ${data.customerName}` : ''}
            </p>
          </div>
          <StatusPill status={data.orderStatus} />
        </div>
      </div>

      <JourneyBlock status={data.orderStatus} />
      <CourierCard courier={data.courier} />

      {/* Items + totals */}
      <div className={SECTION_CARD_CLASS}>
        <div className="flex items-center justify-between">
          <p className="font-label-caps text-[0.65rem] tracking-[0.15em] text-muted dark:text-dark-muted">Items</p>
          <p className="text-xs text-muted dark:text-dark-muted">
            {data.items.reduce((sum, item) => sum + item.quantity, 0)} pcs
          </p>
        </div>
        <ul className="mt-3 divide-y divide-border dark:divide-dark-border">
          {data.items.map((item, index) => (
            <li key={index} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-warm-sand dark:border-dark-border dark:bg-slate-700/60 sm:h-14 sm:w-14">
                {item.itemImagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.itemImagePath}
                    alt={item.productTitle}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted dark:text-dark-muted">
                    <Package className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-on-surface dark:text-dark-text">
                  {item.productTitle}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted dark:text-dark-muted">
                  {[item.variantName, `${item.quantity} × ${money(item.purchasePrice)}`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-on-surface dark:text-dark-text">
                {money(Number(item.purchasePrice) * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-1.5 border-t border-border pt-4 dark:border-dark-border">
          <div className="flex justify-between text-sm text-muted dark:text-dark-muted">
            <span>Items</span>
            <span>{money(data.itemsTotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted dark:text-dark-muted">
            <span>Delivery{data.shippingArea ? ` (${data.shippingArea})` : ''}</span>
            <span>{money(data.deliveryCharge)}</span>
          </div>
          {Number(data.discount) > 0 && (
            <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
              <span>Discount</span>
              <span>−{money(data.discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-on-surface dark:border-dark-border dark:text-dark-text">
            <span>Total</span>
            <span>{money(data.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-page-margin-mobile sm:px-4 lg:px-page-margin-desktop">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="pb-10 pt-12 sm:pb-14 sm:pt-16">
        <nav className="mb-8 flex items-center gap-1.5 text-xs text-muted" aria-label="Breadcrumb">
          <Link href="/" className="transition-colors hover:text-primary dark:hover:text-primary">
            Home
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface dark:text-dark-text">Track Order</span>
        </nav>

        <div className="text-center">
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 via-secondary/15 to-transparent" />
            <span className="absolute -inset-2 rounded-full border border-dashed border-primary/25" />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-lg sm:h-14 sm:w-14">
              <PackageSearch className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
          </div>

          <h1 className="mt-5 font-display text-headline-md font-bold text-on-surface sm:text-headline-lg dark:text-dark-text">
            Track Your Order
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted dark:text-dark-muted sm:text-base">
            Enter your order number or the mobile number you ordered with to see live delivery status.
          </p>
        </div>
      </div>

      {/* ── Lookup form ──────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className={SECTION_CARD_CLASS} noValidate>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted/70 dark:text-dark-muted/70">
            {loading ? (
              <span className="block h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            ) : (
              <Search className="h-[18px] w-[18px]" />
            )}
          </span>
          <input
            id="track-query"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={16}
            value={query}
            onChange={(e) => setQuery(e.target.value.replace(/[^\d+\- ]/g, '').slice(0, 16))}
            placeholder="Order number or mobile number..."
            className={INPUT_CLASS + (query ? ' pr-11' : '')}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                reset();
              }}
              aria-label="Clear"
              className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-warm-sand text-muted transition hover:text-on-surface dark:bg-slate-700/60 dark:text-dark-muted dark:hover:text-dark-text"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="group mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm dark:bg-primary dark:text-white dark:hover:bg-primary/90"
        >
          <Search className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
          {loading ? 'Searching…' : 'Search'}
        </button>

        {error && !summary && !order && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {error === 'invalid'
                ? lookupKind === 'phone'
                  ? 'Please enter a valid Bangladeshi mobile number.'
                  : 'Please enter a valid order number or Bangladeshi mobile number.'
                : lookupKind === 'order'
                  ? "We couldn't find an order with that order number."
                  : "We couldn't find any orders placed with that mobile number."}
            </p>
          </div>
        )}
      </form>

      {/* ── Result: full detail (from list) ──────────────────── */}
      {order && <FullDetail data={order} fromList={orders !== null} />}

      {/* ── Result: order-number-only summary ────────────────── */}
      {!order && summary && lookupKind === 'order' && (
        <div className="mt-6 space-y-4 animate-fade-in sm:mt-8 sm:space-y-5">
          <div className={SECTION_CARD_CLASS}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-label-caps text-[0.65rem] tracking-[0.15em] text-muted dark:text-dark-muted">
                  Order Number
                </p>
                <p className="font-display text-xl font-bold text-on-surface dark:text-dark-text sm:text-2xl">
                  #{summary.orderNo}
                </p>
                <p className="mt-1 text-xs text-muted dark:text-dark-muted">
                  Placed on {fmtDate(summary.createdAt)} ·{' '}
                  <span className="font-semibold text-on-surface dark:text-dark-text">{money(summary.total)}</span>
                </p>
              </div>
              <StatusPill status={summary.orderStatus} />
            </div>

            <button
              type="button"
              onClick={reset}
              className="mt-3 text-xs font-medium text-muted underline-offset-2 transition hover:text-primary hover:underline dark:text-dark-muted dark:hover:text-primary"
            >
              Track a different order
            </button>
          </div>

          <CourierCard courier={summary.courier} />
        </div>
      )}

      {/* ── Result: phone-number list ────────────────────────── */}
      {!order && orders && lookupKind === 'phone' && (
        <div className="mt-6 space-y-4 animate-fade-in sm:mt-8">
          <p className="font-label-caps text-[0.65rem] tracking-[0.15em] text-muted dark:text-dark-muted">
            {orders.length} order{orders.length > 1 ? 's' : ''} found with this number
          </p>

          <ul className="space-y-3">
            {orders.map((o) => (
              <li
                key={o.orderNo}
                className={`${CARD_CLASS} flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-primary/50 sm:p-5`}
              >
                <div className="min-w-0">
                  <p className="font-display text-base font-bold text-on-surface dark:text-dark-text sm:text-lg">
                    #{o.orderNo}
                  </p>
                  <p className="mt-1 text-xs text-muted dark:text-dark-muted">
                    {fmtDate(o.createdAt)} ·{' '}
                    <span className="font-semibold text-on-surface dark:text-dark-text">{money(o.total)}</span>
                    {o.courierBooking?.trackingCode ? ' · courier parcel' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={o.orderStatus} />
                  <button
                    type="button"
                    disabled={detailLoading}
                    onClick={() => loadDetail(o.orderNo, query.trim())}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary dark:text-white"
                  >
                    {detailFor === o.orderNo && detailLoading ? 'Loading…' : 'Details'}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={reset}
            className="text-xs font-medium text-muted underline-offset-2 transition hover:text-primary hover:underline dark:text-dark-muted dark:hover:text-primary"
          >
            Track a different order
          </button>
        </div>
      )}

      {/* ── Help footer ──────────────────────────────────────── */}
      <div className="mt-8 sm:mt-10">
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-gradient-to-r from-warm-sand/70 via-white to-white p-5 dark:border-dark-border dark:from-slate-800/60 dark:via-dark-card dark:to-dark-card sm:flex-row sm:p-6">
          <div className="flex items-start gap-3 text-center sm:text-left">
            <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/10 text-[#25D366] sm:flex">
              <Headset className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-on-surface dark:text-dark-text">Need help with your order?</p>
              <p className="mt-0.5 text-xs text-muted dark:text-dark-muted sm:text-sm">
                Our team is one WhatsApp message away{siteName ? ` — the ${siteName} team` : ''}.
              </p>
            </div>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <a
              href={waNumber ? `https://wa.me/${waNumber}` : 'https://wa.me/'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1ebe5b] active:scale-[0.98] sm:flex-none"
            >
              <WhatsAppIcon className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="pb-10 sm:pb-12" />
    </div>
  );
}
