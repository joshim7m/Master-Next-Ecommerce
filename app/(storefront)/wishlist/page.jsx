'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { loadWishlist, clearWishlist } from '../../../src/lib/wishlistStorage';
import ProductGrid from '../(home)/_partials/ProductGrid';

export default function WishlistPage() {
  const [productIds, setProductIds] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = loadWishlist();
    setProductIds(ids);

    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    async function fetchProducts() {
      try {
        const res = await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const handleClear = () => {
    clearWishlist();
    setProductIds([]);
    setProducts([]);
  };

  return (
    <div className="mx-auto max-w-[1440px] px-page-margin-mobile py-8 sm:px-6 lg:px-page-margin-desktop sm:py-12">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-primary dark:hover:text-[#a78bfa] transition-colors">Home</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-on-surface dark:text-dark-text">Wishlist</span>
      </nav>

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-headline-md font-bold text-on-surface dark:text-dark-text">Wishlist</h1>
          <p className="mt-1 text-muted dark:text-dark-muted">
            {loading ? 'Loading...' : `${products.length} product${products.length !== 1 ? 's' : ''} saved`}
          </p>
        </div>
        {products.length > 0 && (
          <button
            onClick={handleClear}
            className="text-sm font-medium text-destructive hover:text-destructive/80 transition"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl bg-warm-sand dark:bg-dark-card">
              <div className="aspect-square bg-warm-sand dark:bg-dark-card rounded-t-xl" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-warm-sand dark:bg-dark-card rounded w-3/4" />
                <div className="h-4 bg-warm-sand dark:bg-dark-card rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center">
          <span className="material-symbols-outlined text-[64px] text-muted/30 dark:text-dark-muted/30">favorite</span>
          <h2 className="mt-4 text-lg font-semibold text-on-surface dark:text-dark-text">Your wishlist is empty</h2>
          <p className="mt-1 text-muted dark:text-dark-muted">Save products you love to your wishlist.</p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary/90 transition dark:bg-primary dark:text-dark-text"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
