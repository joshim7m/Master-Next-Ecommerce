'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadCart, updateCartItem, removeCartItem } from '../../lib/cartStorage';

export default function CartDrawer({ open, onClose }) {
  const [cart, setCart] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setCart(loadCart());
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!mounted) return null;

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price ?? 0) * item.quantity, 0);

  const handleQty = (index, delta) => {
    const item = cart[index];
    const next = item.quantity + delta;
    if (next <= 0) {
      removeCartItem(index);
    } else {
      updateCartItem(index, next);
    }
    setCart(loadCart());
  };

  const handleRemove = (index) => {
    removeCartItem(index);
    setCart(loadCart());
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[110] bg-black/40 transition-opacity" onClick={onClose} />
      )}

      <div
        className={`fixed right-0 top-0 z-[120] flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-300 sm:w-[420px] dark:bg-dark-bg ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 dark:border-dark-border">
          <div>
            <h2 className="text-lg font-semibold text-on-surface dark:text-dark-text">Cart</h2>
            <p className="text-xs text-muted dark:text-dark-muted">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-warm-sand hover:text-on-surface/70 transition dark:text-dark-muted dark:hover:bg-dark-card dark:hover:text-dark-text/70"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-16 text-center">
              <span className="material-symbols-outlined text-[64px] mb-4 text-muted/30 dark:text-dark-muted/30">shopping_cart</span>
              <p className="text-sm text-muted dark:text-dark-muted">Your cart is empty</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 text-sm font-medium text-primary hover:underline dark:text-primary"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {cart.map((item, i) => (
                <li key={`${item.productSlug}-${item.variantId || ''}`} className="flex gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-warm-sand dark:bg-dark-card">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted/30 dark:text-dark-muted/30">
                        <span className="material-symbols-outlined text-[24px]">inventory_2</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between gap-1 min-w-0">
                    <div>
                      <p className="text-sm font-medium text-on-surface line-clamp-1 dark:text-dark-text">{item.title}</p>
                      {item.variantName && item.variantName !== 'Default' && (
                        <p className="text-xs text-muted dark:text-dark-muted">{item.variantName}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQty(i, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-sm text-on-surface/70 hover:bg-warm-sand transition dark:border-dark-border dark:text-dark-text/70 dark:hover:bg-dark-card"
                        >
                          −
                        </button>
                        <span className="min-w-[1.5rem] text-center text-sm font-medium text-on-surface dark:text-dark-text">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleQty(i, 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-sm text-on-surface/70 hover:bg-warm-sand transition dark:border-dark-border dark:text-dark-text/70 dark:hover:bg-dark-card"
                        >
                          +
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary dark:text-primary">৳{(Number(item.price) * item.quantity).toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => handleRemove(i)}
                          className="text-muted/30 hover:text-destructive transition dark:text-dark-muted/30 dark:hover:text-destructive"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-border px-5 py-4 dark:border-dark-border">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-on-surface/70 dark:text-dark-text/70">Subtotal</span>
              <span className="text-lg font-semibold text-on-surface dark:text-dark-text">৳{subtotal.toLocaleString()}</span>
            </div>
            <Link
              href="/checkout"
              onClick={onClose}
              className="mb-2 flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary/90 transition dark:bg-primary dark:text-on-primary dark:hover:bg-primary/90"
            >
              Checkout
            </Link>
            <Link
              href="/cart"
              onClick={onClose}
              className="flex w-full items-center justify-center rounded-xl border-2 border-primary bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:bg-primary hover:text-on-primary dark:bg-dark-card dark:text-primary dark:hover:bg-primary dark:hover:text-on-primary"
            >
              View Cart
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
