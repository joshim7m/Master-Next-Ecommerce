'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadCart, clearCart } from '../../../src/lib/cartStorage';
import { pushDataLayer } from '../../../src/lib/gtm';
import useDeviceFingerprint from '../../../src/hooks/useDeviceFingerprint';

const MOBILE_REGEX = /^(013|014|015|016|017|018|019)\d{8}$/;

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
        body: JSON.stringify({ ...form, items: cart, deviceHash }),
      });

      if (!res.ok) {
        throw new Error(await tryReadError(res));
      }

      const data = await res.json();
      if (!data.orderNo) throw new Error('Invalid response from server');

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
          <p className="mt-4 text-muted dark:text-dark-muted">Your cart is empty. Add items before checking out.</p>
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
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{errorMsg}</div>
          ) : null}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-on-surface/70 dark:text-dark-text/70">Name *</label>
              <input id="name" name="name" value={form.name} onChange={handleChange} className={`mt-1.5 w-full rounded-xl border p-3 text-sm dark:text-dark-text dark:placeholder:text-dark-muted ${errors.name ? 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-900/20' : 'border-border bg-warm-sand dark:border-dark-border dark:bg-dark-surface'}`} placeholder="Your name" />
              {errors.name ? <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{errors.name}</p> : null}
            </div>
            <div>
              <label htmlFor="mobile" className="block text-sm font-medium text-on-surface/70 dark:text-dark-text/70">Mobile *</label>
              <input id="mobile" name="mobile" value={form.mobile} onChange={handleChange} className={`mt-1.5 w-full rounded-xl border p-3 text-sm dark:text-dark-text dark:placeholder:text-dark-muted ${errors.mobile ? 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-900/20' : 'border-border bg-warm-sand dark:border-dark-border dark:bg-dark-surface'}`} placeholder="01XXXXXXXXX" />
              {errors.mobile ? <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{errors.mobile}</p> : null}
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-on-surface/70 dark:text-dark-text/70">Address *</label>
              <textarea id="address" name="address" value={form.address} onChange={handleChange} rows="3" className={`mt-1.5 w-full rounded-xl border p-3 text-sm dark:text-dark-text dark:placeholder:text-dark-muted ${errors.address ? 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-900/20' : 'border-border bg-warm-sand dark:border-dark-border dark:bg-dark-surface'}`} placeholder="Street address, building, floor" />
              {errors.address ? <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{errors.address}</p> : null}
            </div>
            <div className="rounded-xl border border-border bg-warm-sand p-4 dark:border-dark-border dark:bg-dark-surface">
              <p className="text-sm font-medium text-on-surface/70 dark:text-dark-text/70">Delivery</p>
              <div className="mt-3 space-y-2">
                <label className="flex items-center gap-3">
                  <input type="radio" name="shippingArea" value="Inside Dhaka" checked={form.shippingArea === 'Inside Dhaka'} onChange={handleChange} className="h-4 w-4 text-primary" />
                  <span className="text-sm">Inside Dhaka — 80 taka</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="radio" name="shippingArea" value="Outside Dhaka" checked={form.shippingArea === 'Outside Dhaka'} onChange={handleChange} className="h-4 w-4 text-primary" />
                  <span className="text-sm">Outside Dhaka — 120 taka</span>
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 active:scale-[0.98] transition disabled:opacity-50 dark:bg-primary dark:text-dark-text"
          >
            {submitting ? 'Processing...' : 'Place Order'}
          </button>
        </div>

        <aside className="mt-6 rounded-2xl border border-border bg-white shadow-ambient lg:mt-0 dark:border-dark-border dark:bg-dark-card">
          <div className="border-b border-border px-4 py-3 sm:px-6 sm:py-4 dark:border-dark-border">
            <h2 className="text-sm font-semibold text-on-surface dark:text-dark-text">Order Summary</h2>
          </div>
          <div className="divide-y divide-border dark:divide-dark-border">
            {cart.map((item, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 sm:px-6 sm:py-4">
                {item.image ? (
                  <img src={item.image} alt={item.title} className="h-14 w-14 flex-shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="h-14 w-14 flex-shrink-0 rounded-xl bg-warm-sand dark:bg-dark-surface" />
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
        </aside>
      </form>
    </section>
  );
}
