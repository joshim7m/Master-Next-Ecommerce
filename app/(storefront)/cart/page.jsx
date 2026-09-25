'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { loadCart, updateCartItem, removeCartItem } from '../../../src/lib/cartStorage';
import { pushDataLayer } from '../../../src/lib/gtm';

export default function CartPage() {
  const [cart, setCart] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setCart(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && cart.length > 0) {
      pushDataLayer('view_cart', {
        ecommerce: {
          items: cart.map((item) => ({
            item_id: item.sku,
            item_name: item.title,
            price: Number(item.price ?? 0),
            item_variant: item.variantName,
            quantity: item.quantity,
          })),
          value: cart.reduce((sum, item) => sum + Number(item.price ?? 0) * item.quantity, 0),
          currency: 'BDT',
        },
      });
    }
  }, [hydrated]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.price ?? 0) * item.quantity, 0);
  }, [cart, refresh]);

  const handleQuantity = (index, delta) => {
    const item = cart[index];
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      removeCartItem(index);
    } else {
      updateCartItem(index, newQty);
    }
    setCart(loadCart());
    setRefresh((v) => v + 1);
  };

  const handleRemove = (index) => {
    removeCartItem(index);
    setCart(loadCart());
    setRefresh((v) => v + 1);
  };

  return (
    <section className="mx-auto max-w-[1440px] px-page-margin-mobile sm:px-6 lg:px-page-margin-desktop py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-on-surface dark:text-dark-text">Your Cart</h1>

        {cart.length === 0 ? (
          <div className="mt-8 rounded-xl border border-border bg-white p-10 text-center shadow-sm dark:border-dark-border dark:bg-dark-card">
            <span className="material-symbols-outlined text-[48px] text-muted dark:text-dark-muted">shopping_cart</span>
            <p className="mt-2 text-muted dark:text-dark-muted">Your cart is empty.</p>
            <Link href="/categories" className="mt-4 inline-block rounded-xl bg-primary px-6 py-3 text-white hover:bg-primary/90 transition dark:bg-primary dark:text-dark-text">
              Browse products
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {cart.map((item, index) => (
              <div key={`${item.productSlug}-${item.variantId}-${index}`} className="rounded-xl border border-border bg-white p-4 shadow-sm dark:border-dark-border dark:bg-dark-card">
                <div className="flex items-start gap-4">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="h-24 w-24 rounded-lg object-cover" />
                  ) : (
                    <div className="h-24 w-24 rounded-lg bg-warm-sand dark:bg-dark-card" />
                  )}
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${item.productSlug}`} className="font-medium text-on-surface hover:text-primary transition dark:text-dark-text dark:hover:text-primary">
                      {item.title}
                    </Link>
                    <div className='flex items-center gap-x-2'>
                      <span>
                        {item.sku ? (
                          <p className="text-xs text-green-500">SKU: {item.sku}</p>
                        ) : null}
                      </span>
                      <span className='text-muted'> | </span>
                      <span>
                        {item.variantName ? (
                          <p className="text-xs text-orange-400">{item.variantName}</p>
                        ) : null}
                      </span>

                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <button onClick={() => handleQuantity(index, -1)} className="h-8 w-8 rounded-full border border-border text-sm hover:border-primary/30 dark:border-slate-600 dark:hover:border-primary/30" disabled={item.quantity <= 1}>−</button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => handleQuantity(index, 1)} className="h-8 w-8 rounded-full border border-border text-sm hover:border-primary/30 dark:border-slate-600 dark:hover:border-primary/30">+</button>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-primary dark:text-primary">৳ {Number(item.price ?? 0).toLocaleString()}</p>
                    <button onClick={() => handleRemove(index)} className="mt-2 text-xs text-destructive hover:text-destructive/80">Remove</button>
                  </div>
                </div>
              </div>
            ))}

            <div className="rounded-xl border border-border bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-card">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-on-surface dark:text-dark-text">Subtotal</p>
                <p className="text-lg font-semibold text-primary dark:text-primary">৳ {subtotal.toLocaleString()}</p>
              </div>
            </div>

            <Link
              href="/checkout"
              className="inline-flex rounded-xl bg-primary px-6 py-4 text-white hover:bg-primary/90 transition dark:bg-primary dark:text-dark-text"
            >
              চেকআউটে যান
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
