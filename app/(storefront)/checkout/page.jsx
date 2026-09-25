'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadCart, clearCart } from '../../../src/lib/cartStorage';
import { pushDataLayer } from '../../../src/lib/gtm';
import useDeviceFingerprint from '../../../src/hooks/useDeviceFingerprint';

const MOBILE_REGEX = /^(013|014|015|016|017|018|019)\d{8}$/;
const DRAFT_KEY = 'incomplete-checkout-orderNo';
const DRAFT_SAVE_DELAY = 1200;

function validate(form) {
  const errors = {};

  const name = form.name.trim();
  if (!name) {
    errors.name = 'Name is required.';
  } else if (name.length < 3) {
    errors.name = 'Name must be at least 3 characters.';
  } else if (name.length > 20) {
    errors.name = 'Name must be under 20 characters.';
  } else if (!/^[A-Za-z\s]+$/.test(name)) {
    errors.name = 'Only letters and spaces allowed.';
  }

  const mobile = form.mobile.trim();
  if (!mobile) {
    errors.mobile = 'Mobile number is required.';
  } else if (!MOBILE_REGEX.test(mobile)) {
    errors.mobile = 'Enter a valid BD mobile number (e.g. 017XXXXXXXX).';
  }

  const address = form.address.trim();
  if (!address) {
    errors.address = 'Address is required.';
  } else if (address.length < 20) {
    errors.address = 'Address must be at least 20 characters.';
  } else if (address.length > 100) {
    errors.address = 'Address must be under 100 characters.';
  }

  return errors;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const deviceHash = useDeviceFingerprint();

  useEffect(() => {
    setCart(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (deviceHash) {
      fetch(`/api/checkout/check-blocked?deviceHash=${deviceHash}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.blocked) {
            window.location.href = 'https://google.com';
          }
        })
        .catch(() => {});
    }
  }, [deviceHash]);

  useEffect(() => {
    if (hydrated && cart.length > 0) {
      const delivery = form.shippingArea === 'Outside Dhaka' ? 120 : 80;
      const sub = cart.reduce((sum, item) => sum + Number(item.price ?? 0) * item.quantity, 0);
      pushDataLayer('begin_checkout', {
        ecommerce: {
          items: cart.map((item) => ({
            item_id: item.sku,
            item_name: item.title,
            price: Number(item.price ?? 0),
            item_variant: item.variantName,
            quantity: item.quantity,
          })),
          value: sub + delivery,
          currency: 'BDT',
          shipping: delivery,
        },
      });
    }
  }, [hydrated]);

  const [form, setForm] = useState({ name: '', mobile: '', address: '', shippingArea: 'Inside Dhaka' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const draftOrderNoRef = useRef(null);
  const lastDraftPayloadRef = useRef('');

  useEffect(() => {
    draftOrderNoRef.current = sessionStorage.getItem(DRAFT_KEY);
  }, []);

  // Debounced autosave of the incomplete checkout. Nothing is saved until a
  // valid mobile number exists (client gate; the server validates it too).
  useEffect(() => {
    if (!hydrated || submitting || !deviceHash) return;

    if (cart.length === 0) {
      if (draftOrderNoRef.current) {
        const orderNo = draftOrderNoRef.current;
        draftOrderNoRef.current = null;
        lastDraftPayloadRef.current = '';
        sessionStorage.removeItem(DRAFT_KEY);
        fetch(`/api/checkout/incomplete?orderNo=${encodeURIComponent(orderNo)}`, { method: 'DELETE' }).catch(() => {});
      }
      return;
    }

    const mobile = form.mobile.trim();
    if (!MOBILE_REGEX.test(mobile)) return;

    const payload = {
      name: form.name.trim(),
      mobile,
      address: form.address.trim(),
      shippingArea: form.shippingArea,
      items: cart,
      deviceHash,
    };
    const payloadKey = JSON.stringify(payload);
    if (draftOrderNoRef.current && payloadKey === lastDraftPayloadRef.current) return;

    const timer = setTimeout(() => {
      lastDraftPayloadRef.current = payloadKey;
      fetch('/api/checkout/incomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, orderNo: draftOrderNoRef.current || undefined }),
      })
        .then(async (res) => {
          if (!res.ok) return;
          const data = await res.json();
          if (data.orderNo) {
            draftOrderNoRef.current = data.orderNo;
            sessionStorage.setItem(DRAFT_KEY, data.orderNo);
          }
        })
        .catch(() => {});
    }, DRAFT_SAVE_DELAY);

    return () => clearTimeout(timer);
  }, [form, cart, hydrated, submitting, deviceHash]);

  const deliveryCharge = form.shippingArea === 'Outside Dhaka' ? 120 : 80;
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price ?? 0) * item.quantity, 0);
  const total = subtotal + deliveryCharge;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  async function tryReadError(res) {
    try {
      const data = await res.json();
      return data.error || 'Checkout failed';
    } catch {
      return `Checkout failed (${res.status})`;
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const fieldErrors = validate(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    if (cart.length === 0) {
      setErrorMsg('Your cart is empty.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, items: cart, deviceHash, draftOrderNo: draftOrderNoRef.current || undefined }),
      });

      if (!res.ok) {
        throw new Error(await tryReadError(res));
      }

      const data = await res.json();
      if (!data.orderNo) throw new Error('Invalid response from server');

      draftOrderNoRef.current = null;
      lastDraftPayloadRef.current = '';
      sessionStorage.removeItem(DRAFT_KEY);

      const delivery = form.shippingArea === 'Outside Dhaka' ? 120 : 80;
      const sub = cart.reduce((sum, item) => sum + Number(item.price ?? 0) * item.quantity, 0);
      sessionStorage.setItem('gtm_purchase', JSON.stringify({
        transaction_id: data.orderNo,
        value: Number(data.total),
        currency: 'BDT',
        shipping: delivery,
        items: cart.map((item) => ({
          item_id: item.sku,
          item_name: item.title,
          price: Number(item.price ?? 0),
          item_variant: item.variantName,
          quantity: item.quantity,
        })),
      }));

      clearCart();
      router.push(`/thankyou?orderNo=${data.orderNo}`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!hydrated) {
    return (
      <section className="mx-auto max-w-[1440px] px-page-margin-mobile py-6 sm:px-6 lg:px-page-margin-desktop">
        <div className="mx-auto max-w-sm rounded-2xl border border-border bg-white p-6 text-center shadow-ambient sm:max-w-lg sm:p-10 dark:border-dark-border dark:bg-dark-card">
          <div className="h-6 w-48 animate-pulse rounded bg-warm-sand mx-auto dark:bg-dark-card" />
          <div className="mt-4 h-4 w-64 animate-pulse rounded bg-warm-sand mx-auto dark:bg-dark-card" />
        </div>
      </section>
    );
  }

  if (cart.length === 0) {
    return (
      <section className="mx-auto max-w-[1440px] px-page-margin-mobile py-6 sm:px-6 lg:px-page-margin-desktop">
        <div className="mx-auto max-w-sm rounded-2xl border border-border bg-white p-6 text-center shadow-ambient sm:max-w-lg sm:p-10 dark:border-dark-border dark:bg-dark-card">
          <h1 className="text-3xl font-bold dark:text-dark-text">Checkout</h1>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1440px] px-page-margin-mobile py-6 sm:px-6 lg:px-page-margin-desktop">
      <form onSubmit={handleSubmit} className="mx-auto max-w-lg lg:max-w-5xl lg:grid lg:grid-cols-[1fr_420px] lg:gap-8">
        <div className="space-y-4 rounded-2xl border border-border bg-white p-4 shadow-ambient sm:p-6 dark:border-dark-border dark:bg-dark-card">
          <h1 className="text-xl font-bold text-on-surface sm:text-2xl dark:text-dark-text">Checkout</h1>

          {errorMsg ? (
            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{errorMsg}</div>
          ) : null}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-on-surface/70 dark:text-dark-text/70">Name *</label>
              <input id="name" name="name" value={form.name} onChange={handleChange} className={`mt-1.5 w-full rounded-xl border p-3 text-sm dark:text-dark-text dark:placeholder:text-dark-muted ${errors.name ? 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20' : 'border-border bg-warm-sand dark:border-dark-border dark:bg-dark-bg'}`} placeholder="Your name" />
              {errors.name ? <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">{errors.name}</p> : null}
            </div>
            <div>
              <label htmlFor="mobile" className="block text-sm font-medium text-on-surface/70 dark:text-dark-text/70">Mobile *</label>
              <input id="mobile" name="mobile" value={form.mobile} onChange={handleChange} className={`mt-1.5 w-full rounded-xl border p-3 text-sm dark:text-dark-text dark:placeholder:text-dark-muted ${errors.mobile ? 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20' : 'border-border bg-warm-sand dark:border-dark-border dark:bg-dark-bg'}`} placeholder="01XXXXXXXXX" />
              {errors.mobile ? <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">{errors.mobile}</p> : null}
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-on-surface/70 dark:text-dark-text/70">Full Address *</label>
              <textarea id="address" name="address" value={form.address} onChange={handleChange} rows="3" className={`mt-1.5 w-full rounded-xl border p-3 text-sm dark:text-dark-text dark:placeholder:text-dark-muted ${errors.address ? 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20' : 'border-border bg-warm-sand dark:border-dark-border dark:bg-dark-bg'}`} placeholder="Full Address" />
              {errors.address ? <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">{errors.address}</p> : null}
            </div>
            <div className="rounded-xl border border-border bg-warm-sand p-4 dark:border-dark-border dark:bg-dark-bg">
              <p className="text-sm font-medium text-on-surface/70 dark:text-dark-text/70">Delivery Area</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                {[
                  { value: 'Inside Dhaka', charge: 80 },
                  { value: 'Outside Dhaka', charge: 120 },
                ].map((area) => {
                  const checked = form.shippingArea === area.value;
                  return (
                    <label
                      key={area.value}
                      className={`group relative flex flex-1 cursor-pointer items-center gap-3 overflow-hidden rounded-xl border p-4 transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] hover:shadow-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40 ${
                        checked
                          ? 'border-primary bg-white shadow-md ring-1 ring-primary/10 dark:bg-dark-card'
                          : 'border-border bg-white/60 hover:border-primary/50 hover:bg-white dark:border-dark-border dark:bg-dark-card/60 dark:hover:bg-dark-card'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shippingArea"
                        value={area.value}
                        checked={checked}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      {/* Custom Radio Outer Ring */}
                      <span
                        className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[2.5px] transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${
                          checked
                            ? 'border-primary scale-100'
                            : 'border-on-surface/25 dark:border-dark-border scale-100 group-hover:border-primary/50'
                        }`}
                      >
                        {/* Inner Dot */}
                        <span
                          className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                            checked
                              ? 'bg-primary scale-100'
                              : 'bg-transparent scale-0'
                          }`}
                        />
                        {/* Glow Effect when checked */}
                        {checked && (
                          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20 duration-75" />
                        )}
                      </span>
                      {/* Text Section */}
                      <span className={`flex-1 text-sm font-medium transition-colors duration-300 ${
                        checked ? 'text-on-surface dark:text-dark-text' : 'text-on-surface/70 dark:text-dark-text/70 group-hover:text-on-surface dark:group-hover:text-dark-text'
                      }`}>
                        {area.value}
                      </span>
                      {/* Price Badge */}
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${
                        checked
                          ? 'bg-primary/10 text-primary scale-100'
                          : 'bg-on-surface/5 text-muted dark:bg-dark-surface dark:text-dark-muted scale-95 group-hover:scale-100'
                      }`}>
                        {area.charge}৳
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Trust labels */}
            <div className="hidden md:grid grid-cols-3 gap-2 pt-1">
              <div className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-green-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a5 5 0 00-10 0v6a5 5 0 0010 0v-6zM9 13v1a3 3 0 006 0v-1">
                  </path>
                </svg>
                <span className="text-[10px] font-semibold leading-tight sm:text-xs">ক্যাশঅন ডেলিভারি </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4">
                  </path>
                </svg>
                <span className="text-[10px] font-semibold leading-tight sm:text-xs">সিক্রেট প্যাকেজিং </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
                  </path>
                </svg>
                <span className="text-[10px] font-semibold leading-tight sm:text-xs">সারাদেশে ডেলিভারি </span>
              </div>
            </div>
          </div>
        </div>

        <aside className="sticky top-6 mt-6 flex flex-col rounded-2xl border border-border bg-white shadow-ambient lg:mt-0 dark:border-dark-border dark:bg-dark-card">
          <div className="border-b border-border px-4 py-3 sm:px-6 sm:py-4 dark:border-dark-border">
            <h2 className="text-sm font-semibold text-on-surface dark:text-dark-text">Order Summary</h2>
          </div>
          <div className="flex-1 divide-y divide-border dark:divide-dark-border">
            {cart.map((item, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 sm:px-6 sm:py-4">
                {item.image ? (
                  <img src={item.image} alt={item.title} className="h-14 w-14 flex-shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="h-14 w-14 flex-shrink-0 rounded-xl bg-warm-sand dark:bg-dark-card" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug break-words text-on-surface dark:text-dark-text">{item.title}</p>
                  <div className='flex justify-between'>
                    <p className="mt-0.5 text-xs text-muted dark:text-dark-muted">
                    {item.variantName ? <>{item.variantName} &times; {item.quantity}</> : <>&times; {item.quantity}</>}
                  </p>
                  <p className="text-sm font-semibold text-primary whitespace-nowrap dark:text-primary">৳ {(Number(item.price ?? 0) * item.quantity).toLocaleString()}</p>
                  </div>
                </div>

              </div>
            ))}
          </div>
          <div className="space-y-1.5 border-t border-border px-4 py-4 sm:px-6 dark:border-dark-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted dark:text-dark-muted">Subtotal</span>
              <span className="font-medium text-on-surface dark:text-dark-text">৳ {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted dark:text-dark-muted">Delivery</span>
              <span className="font-medium text-on-surface dark:text-dark-text">৳ {deliveryCharge}</span>
            </div>
            <hr className="border-border dark:border-dark-border" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-on-surface dark:text-dark-text">Total</span>
              <span className="text-lg font-bold text-primary dark:text-primary">৳ {total.toLocaleString()}</span>
            </div>
          </div>
          <div className="border-t border-border px-4 py-4 sm:px-6 dark:border-dark-border">
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-sm font-bold text-on-primary hover:bg-primary/90 active:scale-[0.98] transition disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary dark:text-on-primary dark:hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-[20px]">shopping_cart_checkout</span>
              {submitting ? 'Processing...' : 'অর্ডারটি কনফার্ম করুন'}
            </button>

            {/* Trust labels — mobile */}
            <div className="md:hidden mt-3 grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-green-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a5 5 0 00-10 0v6a5 5 0 0010 0v-6zM9 13v1a3 3 0 006 0v-1">
                  </path>
                </svg>
                <span className="text-[10px] font-semibold leading-tight sm:text-xs">ক্যাশঅন ডেলিভারি </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4">
                  </path>
                </svg>
                <span className="text-[10px] font-semibold leading-tight sm:text-xs">সিক্রেট প্যাকেজিং </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
                  </path>
                </svg>
                <span className="text-[10px] font-semibold leading-tight sm:text-xs">সারাদেশে ডেলিভারি </span>
              </div>
            </div>
          </div>
        </aside>
      </form>
    </section>
  );
}
