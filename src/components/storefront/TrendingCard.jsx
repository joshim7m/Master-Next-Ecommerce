'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import { addToCart } from '../../lib/cartStorage';
import { toggleWishlist, loadWishlist } from '../../lib/wishlistStorage';
import { pushDataLayer } from '../../lib/gtm';

export default function TrendingCard({ product, index = 0 }) {
  const [loaded, setLoaded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [added, setAdded] = useState(false);
  const imgRef = useRef(null);

  const price = Number(product.sale_price || product.unite_price);
  const originalPrice = product.sale_price ? Number(product.unite_price) : null;
  const firstImage = product.images?.[0]?.image_path;
  const variant = product.variants?.[0];

  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  useEffect(() => {
    setWishlisted(loadWishlist().includes(product.id));
    const handler = () => setWishlisted(loadWishlist().includes(product.id));
    window.addEventListener('wishlist-updated', handler);
    return () => window.removeEventListener('wishlist-updated', handler);
  }, [product.id]);

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      productId: product.id,
      productSlug: product.slug,
      sku: product.sku,
      title: product.title,
      image: firstImage || '',
      variantId: variant ? variant.id : 'default',
      variantName: variant ? (variant.variant_name || 'Default') : 'Default',
      price: String(price),
      salePrice: product.sale_price ? String(product.sale_price) : null,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);

    pushDataLayer('add_to_cart', {
      ecommerce: {
        items: [{
          item_id: product.sku,
          item_name: product.title,
          price: Number(price),
          item_variant: variant ? (variant.variant_name || 'Default') : 'Default',
          quantity: 1,
        }],
      },
    });
  };

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
        <div className="mt-auto flex items-center justify-between gap-2">
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
          <button
            type="button"
            onClick={handleAddToCart}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out hover:scale-110 hover:shadow-md active:scale-90 ${
              added
                ? 'bg-success/15 text-success dark:bg-success/25'
                : 'bg-secondary/10 dark:bg-secondary/20 text-secondary hover:bg-secondary hover:text-white'
            }`}
          >
            {added ? (
              <Check size={18} strokeWidth={2.5} />
            ) : (
              <ShoppingCart size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}