'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrder } from '../../actions/orders';
import { DEFAULT_DELIVERY_AREAS } from '../../lib/deliveryAreas';

const PHONE_REGEX = /^(?:\+?88)?01[3-9]\d{8}$/;

const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]';
const LABEL =
  'block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 dark:text-slate-400';
const SECTION_TITLE =
  'text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500';

/** Effective price of a product row (no variant context): sale then unit. */
function productPrice(p) {
  return Number(p.sale_price ?? p.unite_price ?? 0);
}

/** Label for a variant, matching the storefront cart naming. */
function variantName(v) {
  return Array.isArray(v.options) ? v.options.filter(Boolean).join(' / ') || 'Default' : 'Default';
}

/** Price for a variant row, mirroring ProductInfo: variant sale → unit → product. */
function variantPrice(v, product) {
  if (v.sale_price !== null && v.sale_price !== undefined) return Number(v.sale_price);
  if (v.unite_price !== null && v.unite_price !== undefined) return Number(v.unite_price);
  return productPrice(product);
}

function variantImage(v, product) {
  return v.image?.image_path || product.images?.[0]?.image_path || null;
}

/**
 * Admin "Create Order" modal: search products → pick variant → build the cart,
 * fill customer details, then save. The server re-prices everything, so the
 * prices shown here are just a preview.
 */
export default function CreateOrderModal({ onClose }) {
  const router = useRouter();

  // ── Product search ──
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null); // null = idle (nothing searched yet)
  const [searching, setSearching] = useState(false);
  const [expandedId, setExpandedId] = useState(null); // product whose variants are open
  const searchTimer = useRef(null);

  // ── Order lines ──
  const [cart, setCart] = useState([]);
  const [cartError, setCartError] = useState(null);

  // ── Customer ──
  const [areas, setAreas] = useState(DEFAULT_DELIVERY_AREAS);
  const [form, setForm] = useState({
    customerName: '',
    phoneNumber: '',
    shippingArea: '',
    shippingAddress: '',
    orderNote: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // Free-delivery promo (Settings → Site Config); the server re-verifies on save.
  const [freeDelivery, setFreeDelivery] = useState({ enabled: false, minProducts: 2 });

  useEffect(() => {
    fetch('/api/admin/settings/site-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const list = data?.deliveryAreas;
        if (Array.isArray(list) && list.length) {
          setAreas(list.map((a) => ({ name: String(a.name), charge: Number(a.charge) })));
        }
        setFreeDelivery({
          enabled: Boolean(data?.freeDeliveryEnabled),
          minProducts: Number(data?.freeDeliveryMinProducts) >= 1 ? Number(data.freeDeliveryMinProducts) : 2,
        });
      })
      .catch(() => {});
  }, []);

  // Preselect the first configured zone once areas load.
  useEffect(() => {
    setForm((f) => (f.shippingArea ? f : { ...f, shippingArea: areas[0]?.name || '' }));
  }, [areas]);

  // Debounced product search — only from 2 characters on.
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (query.trim().length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/products?q=${encodeURIComponent(query.trim())}`);
        setResults(res.ok ? await res.json() : []);
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  const addToCart = (entry) => {
    setCartError(null);
    setCart((c) => {
      const hit = c.find((l) => l.key === entry.key);
      if (hit) {
        return c.map((l) => (l.key === entry.key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...c, entry];
    });
  };

  const lineFromProduct = (product) => ({
    key: `p:${product.id}`,
    productId: product.id,
    variantId: null,
    title: product.title,
    lineLabel: 'Default',
    sku: product.sku || null,
    price: productPrice(product),
    image: product.images?.[0]?.image_path || null,
    quantity: 1,
  });

  const lineFromVariant = (product, variant) => ({
    key: `v:${variant.id}`,
    productId: product.id,
    variantId: variant.id,
    title: product.title,
    lineLabel: variantName(variant),
    sku: variant.sku || product.sku || null,
    price: variantPrice(variant, product),
    image: variantImage(variant, product),
    quantity: 1,
  });

  const changeQty = (key, delta) => {
    setCart((c) =>
      c
        .map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity >= 1)
    );
  };

  const removeLine = (key) => setCart((c) => c.filter((l) => l.key !== key));

  const subtotal = useMemo(
    () => cart.reduce((s, l) => s + l.price * l.quantity, 0),
    [cart]
  );
  const distinctProducts = useMemo(() => new Set(cart.map((l) => l.productId)).size, [cart]);
  const freeDeliveryEligible = freeDelivery.enabled && distinctProducts >= freeDelivery.minProducts;
  const deliveryCharge = freeDeliveryEligible
    ? 0
    : areas.find((a) => a.name === form.shippingArea)?.charge ?? 0;
  const total = subtotal + deliveryCharge;

  const validate = () => {
    const errs = {};
    if (!form.customerName.trim()) errs.name = 'Customer name is required.';
    const phone = form.phoneNumber.trim();
    if (!phone) errs.phone = 'Mobile number is required.';
    else if (!PHONE_REGEX.test(phone)) errs.phone = 'Enter a valid Bangladeshi mobile number, e.g. 017XXXXXXXX.';
    if (!form.shippingAddress.trim()) errs.address = 'Shipping address is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    setFormError(null);
    if (cart.length === 0) {
      setCartError('Add at least one item to the order.');
      return;
    }
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { orderNo } = await createOrder({
        items: cart.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
        customerName: form.customerName,
        phoneNumber: form.phoneNumber,
        shippingArea: form.shippingArea,
        shippingAddress: form.shippingAddress,
        orderNote: form.orderNote,
      });
      router.push(`/admin/orders/${orderNo}`);
    } catch (e) {
      setFormError(e?.message?.replace(/^Error: /, '') || 'Failed to create order');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800"
        role="dialog"
        aria-modal="true"
        aria-label="Create order"
      >
        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2f0f6b] text-white shadow-sm dark:bg-[#a78bfa] dark:text-slate-900">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-tight text-slate-900 dark:text-white">Create Order</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manual order for phone / walk-in customers</p>
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
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {/* Products */}
          <p className={SECTION_TITLE}>1 · Products</p>
          <div className="relative mt-2">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products by name or SKU…"
              className={`${INPUT} pl-9`}
            />
          </div>

          <div className="mt-2 space-y-1.5">
            {searching && (
              <div className="flex items-center justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-200 border-t-[#2f0f6b] dark:border-slate-700 dark:border-t-[#a78bfa]" />
              </div>
            )}
            {!searching && results !== null && results.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                No products found for “{query.trim()}”.
              </p>
            )}
            {!searching &&
              (results || []).map((p) => {
                const open = expandedId === p.id;
                return (
                  <div key={p.id} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setExpandedId(open ? null : p.id)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/40"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-700">
                        {p.images?.[0]?.image_path ? (
                          <img src={p.images[0].image_path} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{p.title}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {p.variants?.length ? `${p.variants.length} variant${p.variants.length === 1 ? '' : 's'}` : 'No variants'} · ৳{productPrice(p).toLocaleString()}
                        </p>
                      </div>
                      <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {open && (
                      <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-2 space-y-1 dark:border-slate-700 dark:bg-slate-900/40">
                        {p.variants?.length
                          ? p.variants.map((v) => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => addToCart(lineFromVariant(p, v))}
                                className="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-white hover:shadow-sm dark:hover:bg-slate-700/60"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate font-medium text-slate-900 dark:text-white">{variantName(v)}</span>
                                  <span className="block text-xs text-slate-400 dark:text-slate-500">SKU: {v.sku || p.sku || 'N/A'}</span>
                                </span>
                                <span className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                                  ৳{variantPrice(v, p).toLocaleString()}
                                  <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </span>
                              </button>
                            ))
                          : (
                            <button
                              type="button"
                              onClick={() => addToCart(lineFromProduct(p))}
                              className="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-white hover:shadow-sm dark:hover:bg-slate-700/60"
                            >
                              <span className="font-medium text-slate-900 dark:text-white">Default</span>
                              <span className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                                ৳{productPrice(p).toLocaleString()}
                                <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </span>
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                );
              })}
            {cartError && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{cartError}</p>}

            {/* Order lines */}
            {cart.length > 0 && (
              <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {cart.map((l) => (
                    <li key={l.key} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-700">
                        {l.image ? <img src={l.image} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{l.title}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {l.lineLabel} · ৳{l.price.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => changeQty(l.key, -1)}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                        </button>
                        <span className="min-w-[1.75rem] text-center text-sm font-medium text-slate-900 dark:text-white">{l.quantity}</span>
                        <button
                          type="button"
                          onClick={() => changeQty(l.key, 1)}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                      </div>
                      <span className="w-16 shrink-0 text-right text-sm font-medium text-slate-900 dark:text-white">
                        ৳{(l.price * l.quantity).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLine(l.key)}
                        className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition dark:text-red-500 dark:hover:bg-red-900/20"
                        title="Remove"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Customer */}
          <p className={`${SECTION_TITLE} mt-6`}>2 · Customer</p>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Customer Name</label>
              <input
                type="text"
                value={form.customerName}
                onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                className={INPUT}
                placeholder="Full name"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.name}</p>}
            </div>
            <div>
              <label className={LABEL}>Mobile Number</label>
              <input
                type="tel"
                value={form.phoneNumber}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                className={INPUT}
                placeholder="01XXXXXXXXX"
              />
              {errors.phone && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.phone}</p>}
            </div>
            <div>
              <label className={LABEL}>Delivery Area</label>
              <div className="relative">
                <select
                  value={form.shippingArea}
                  onChange={(e) => setForm((f) => ({ ...f, shippingArea: e.target.value }))}
                  className={`${INPUT} appearance-none pr-8`}
                >
                  {areas.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.name} — ৳{a.charge}
                    </option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <div>
              <label className={LABEL}>Order Note</label>
              <input
                type="text"
                value={form.orderNote}
                onChange={(e) => setForm((f) => ({ ...f, orderNote: e.target.value }))}
                className={INPUT}
                placeholder="Internal note, not shown to the customer"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Shipping Address</label>
              <textarea
                rows={2}
                value={form.shippingAddress}
                onChange={(e) => setForm((f) => ({ ...f, shippingAddress: e.target.value }))}
                className={INPUT}
                placeholder="House, road, area, city"
              />
              {errors.address && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.address}</p>}
            </div>
          </div>
        </div>

        {/* ── Footer: totals + save ── */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/50">
          {formError && (
            <p className="mb-2 text-xs font-medium text-red-500 dark:text-red-400">{formError}</p>
          )}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 text-sm">
              <p className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                Subtotal
                <span className="font-medium text-slate-900 dark:text-white">৳{subtotal.toLocaleString()}</span>
              </p>
              <p className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                Delivery
                <span className="font-medium text-slate-900 dark:text-white">
                  {deliveryCharge > 0 ? `৳${deliveryCharge.toLocaleString()}` : 'Free'}
                </span>
              </p>
              <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                Total
                <span className="text-base font-bold text-[#2f0f6b] dark:text-[#a78bfa]">৳{total.toLocaleString()}</span>
              </p>
              {freeDelivery.enabled && !freeDeliveryEligible && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Free delivery on {freeDelivery.minProducts}+ different products ({distinctProducts}/{freeDelivery.minProducts} so far).
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f0f6b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f0f6b]/90 transition disabled:opacity-50 dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90"
              >
                {submitting ? (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {submitting ? 'Saving…' : 'Save Order'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
