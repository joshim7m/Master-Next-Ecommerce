'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { addToCart, productToCartItem } from '../../lib/cartStorage';
import { toggleWishlist, loadWishlist } from '../../lib/wishlistStorage';
import { pushDataLayer } from '../../lib/gtm';

export default function TrendingCard({ product, index = 0 }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [added, setAdded] = useState(false);
  const imgRef = useRef(null);
  const addedTimer = useRef(null);

  const price = Number(product.sale_price || product.unite_price);
  const originalPrice = product.sale_price ? Number(product.unite_price) : null;
  const firstImage = product.images?.[0]?.image_path;
  const variant = product.variants?.find((v) => v.isDefault) || product.variants?.[0] || null;
  const variantName = variant ? ((variant.options || []).filter(Boolean).join(' / ') || 'Default') : 'Default';

  // Same rule the product page uses (ProductInfo.jsx): the variant's own stock
  // wins, and a product with no stock recorded is treated as unavailable.
  const inStock = (variant?.quantity ?? product.quantity ?? 0) > 0;

  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  useEffect(() => {
    setWishlisted(loadWishlist().includes(product.id));
    const handler = () => setWishlisted(loadWishlist().includes(product.id));
    window.addEventListener('wishlist-updated', handler);
    return () => window.removeEventListener('wishlist-updated', handler);
  }, [product.id]);

  useEffect(() => {
    return () => {
      if (addedTimer.current) clearTimeout(addedTimer.current);
    };
  }, []);

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  // Shared by both CTAs so "Order Now" can't drift from "Add to Cart" — same
  // payload, same analytics. `productToCartItem` picks the same default variant
  // `addToCart` merges on, so the two can't produce separate cart lines.
  const addItem = useCallback(() => {
    addToCart(productToCartItem(product));

    pushDataLayer('add_to_cart', {
      ecommerce: {
        items: [{
          item_id: product.sku,
          item_name: product.title,
          price: Number(price),
          item_variant: variantName,
          quantity: 1,
        }],
      },
    });
  }, [product, price, variantName]);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    addItem();
    setAdded(true);

    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), 1500);
  };

  const handleOrderNow = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Cart is written synchronously, so the checkout page reads the item on mount.
    addItem();
    router.push('/checkout');
  };

  const ctaBase =
    'flex h-9 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition active:scale-[0.98]';

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:ring-offset-warm-sand dark:border-dark-border/60 dark:bg-dark-card dark:hover:border-primary/40 dark:hover:ring-offset-dark-bg"
      style={{ animationDelay: `${(index % 6) * 60}ms` }}
    >
      <Link href={`/products/${product.slug}`} className="block overflow-hidden">
        <div className="image-hover-zoom aspect-square w-full bg-warm-sand dark:bg-dark-card">
          {firstImage ? (
            <img
              ref={imgRef}
              src={firstImage}
              alt={product.images?.[0]?.altText || product.title}
              className={`h-full w-full object-cover transition-all duration-700 ${
                loaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'
              }`}
              loading="lazy"
              onLoad={() => setLoaded(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted dark:text-dark-muted">
              <span className="material-symbols-outlined text-[32px]">image</span>
            </div>
          )}
        </div>
      </Link>

      {/* Wishlist heart */}
      <button
        type="button"
        onClick={handleWishlist}
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 shadow-md backdrop-blur-sm transition-all hover:bg-white hover:scale-110 dark:bg-dark-card/80 sm:opacity-0 sm:group-hover:opacity-100"
        aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <span
          className={`material-symbols-outlined text-[20px] ${wishlisted ? 'text-badge-sale' : 'text-on-surface/50 dark:text-dark-text/50'}`}
          style={wishlisted ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          favorite
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <Link href={`/products/${product.slug}`}>
          <h3 className="line-clamp-2 text-xs font-medium text-on-surface transition-colors hover:text-primary sm:text-sm dark:text-dark-text dark:hover:text-primary">
            {product.title}
          </h3>
        </Link>

        {/* Price — kept on its own row so the CTA footer below has a full line */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-primary sm:text-lg">
            ৳{price.toLocaleString()}
          </span>
          {originalPrice && (
            <span className="text-xs text-muted line-through sm:text-sm dark:text-dark-muted">
              ৳{originalPrice.toLocaleString()}
            </span>
          )}
        </div>

        {/* ── CTA footer: Add to Cart (outline) + Order Now (solid) ── */}
        <div className="mt-auto flex flex-col gap-1.5 border-t border-border/60 pt-2.5 dark:border-dark-border/60">
          {inStock ? (
            <>
              <button
                type="button"
                onClick={handleAddToCart}
                aria-label="Add to cart"
                className={`${ctaBase} ${
                  added
                    ? 'border border-success bg-success/10 text-success'
                    : 'border border-primary bg-white text-primary hover:bg-primary hover:text-on-primary dark:border-primary/60 dark:bg-dark-card dark:text-primary dark:hover:bg-primary dark:hover:text-on-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]" style={added ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {added ? 'check' : 'shopping_cart'}
                </span>
                {added ? 'Added' : 'Add to Cart'}
              </button>

              <button
                type="button"
                onClick={handleOrderNow}
                aria-label="Order now"
                className={`${ctaBase} border border-primary bg-primary text-on-primary shadow-[0_4px_14px_-4px_rgba(13,148,136,0.5)] hover:bg-primary/90 hover:shadow-[0_6px_18px_-4px_rgba(13,148,136,0.6)] dark:bg-primary dark:text-on-primary dark:hover:bg-primary/90`}
              >
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                Order Now
              </button>
            </>
          ) : (
            <div
              className={`${ctaBase} border border-border bg-border text-muted dark:border-dark-border dark:bg-dark-border dark:text-dark-muted`}
              aria-disabled="true"
            >
              Out of Stock
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
