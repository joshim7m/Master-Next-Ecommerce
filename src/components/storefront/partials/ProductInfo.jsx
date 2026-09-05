'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { addToCart } from '../../../lib/cartStorage';
import { toggleWishlist, loadWishlist } from '../../../lib/wishlistStorage';
import { pushDataLayer } from '../../../lib/gtm';

const COLOR_MAP = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308',
  black: '#0f172a', white: '#ffffff', gray: '#64748b', grey: '#64748b',
  purple: '#a855f7', pink: '#ec4899', orange: '#f97316', brown: '#92400e',
  navy: '#1e3a5f', teal: '#14b8a6', cyan: '#06b6d4', indigo: '#6366f1',
  lime: '#84cc16', amber: '#f59e0b', rose: '#f43f5e', violet: '#8b5cf6',
};

function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

function isLight(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

/* ─── Social share buttons ─── */
function ShareButtons({ url, title }) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [url]);

  return (
    <div className="flex items-center justify-center gap-1.5">
      {/* Facebook */}
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-warm-sand text-muted hover:bg-primary/10 hover:text-primary transition dark:bg-dark-card dark:text-dark-muted"
        title="Share on Facebook"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>
      {/* Messenger */}
      <a
        href={`https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=0&redirect_uri=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-warm-sand text-muted hover:bg-[#0084ff]/10 hover:text-[#0084ff] transition dark:bg-dark-card dark:text-dark-muted"
        title="Share on Messenger"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.126-3.37-6.063 3.37L8.99 8.378l3.211 3.37 6.129-3.37-5.153 6.585z" />
        </svg>
      </a>
      {/* WhatsApp */}
      <a
        href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-warm-sand text-muted hover:bg-success/10 hover:text-success transition dark:bg-dark-card dark:text-dark-muted"
        title="Share on WhatsApp"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
      {/* Copy Link */}
      <button
        type="button"
        onClick={handleCopy}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-warm-sand text-muted hover:bg-border hover:text-on-surface transition dark:bg-dark-card dark:text-dark-muted"
        title={copied ? 'Copied!' : 'Copy link'}
      >
        {copied ? (
          <span className="material-symbols-outlined text-[16px] text-success">check</span>
        ) : (
          <span className="material-symbols-outlined text-[16px]">link</span>
        )}
      </button>
    </div>
  );
}

/* ─── Option selector (shared by size, color, etc.) ─── */
function OptionGroup({ label, options, selected, onChange }) {
  const isColor = label.toLowerCase() === 'color';

  return (
    <div>
      <label className="font-label-caps text-[0.65rem] text-muted dark:text-dark-muted">{label}</label>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((opt) => {
          if (isColor) {
            const hex = COLOR_MAP[opt.toLowerCase()] || '#cbd5e1';
            const light = isLight(hex);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={`group relative flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90 ${
                  selected === opt
                    ? 'ring-2 ring-primary ring-offset-2 scale-110 dark:ring-offset-dark-card'
                    : 'ring-1 ring-border hover:ring-primary/50 dark:ring-dark-border dark:hover:ring-primary/50'
                }`}
                title={opt}
              >
                <span
                  className="h-6 w-6 rounded-full border border-black/10"
                  style={{ backgroundColor: hex }}
                />
                {selected === opt && (
                  <span className={`material-symbols-outlined absolute text-[14px] ${light ? 'text-black' : 'text-white'}`}>
                    check
                  </span>
                )}
              </button>
            );
          }

          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`min-w-[2.5rem] rounded-lg border px-3 py-2 text-xs font-medium transition active:scale-95 ${
                selected === opt
                  ? 'border-primary bg-primary text-on-primary shadow-sm dark:text-white'
                  : 'border-border bg-white text-on-surface/70 hover:border-primary/50 hover:shadow-sm dark:border-dark-border dark:bg-dark-card dark:text-dark-text/70 dark:hover:border-primary/50'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main component ─── */
export default function ProductInfo({ product, selectedVariant, variantIndex, onVariantChange, whatsappNumber }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState('');
  const [wishlisted, setWishlisted] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  useEffect(() => {
    const variantName = selectedVariant
      ? `${selectedVariant.size || ''}${selectedVariant.color ? ` / ${selectedVariant.color}` : ''}`.trim()
      : 'Default';
    pushDataLayer('view_item', {
      ecommerce: {
        items: [{
          item_id: product.sku,
          item_name: product.title,
          price: activePrice,
          item_category: product.categories?.[0]?.name || undefined,
          item_variant: variantName,
          quantity: 1,
        }],
      },
    });
  }, [product.id]);

  useEffect(() => {
    setWishlisted(loadWishlist().includes(product.id));
    const handler = () => setWishlisted(loadWishlist().includes(product.id));
    window.addEventListener('wishlist-updated', handler);
    return () => window.removeEventListener('wishlist-updated', handler);
  }, [product.id]);

  const activePrice = useMemo(() => {
    if (selectedVariant?.sale_price) return Number(selectedVariant.sale_price);
    if (selectedVariant?.price) return Number(selectedVariant.price);
    if (product.sale_price) return Number(product.sale_price);
    return Number(product.unite_price);
  }, [product, selectedVariant]);

  const activeOriginalPrice = useMemo(() => {
    if (selectedVariant?.price && selectedVariant.sale_price) return Number(selectedVariant.price);
    if (product.unite_price && product.sale_price) return Number(product.unite_price);
    return null;
  }, [product, selectedVariant]);

  const discountPercent = useMemo(() => {
    if (activeOriginalPrice && activePrice) {
      return Math.round(((activeOriginalPrice - activePrice) / activeOriginalPrice) * 100);
    }
    return 0;
  }, [activeOriginalPrice, activePrice]);

  const stockQty = selectedVariant?.quantity ?? product.quantity ?? 0;
  const inStock = stockQty > 0;

  const variants = product.variants || [];

  const uniqueSizes = useMemo(() => {
    const set = new Set();
    variants.forEach((v) => { if (v.size) set.add(v.size); });
    return [...set];
  }, [variants]);

  const uniqueColors = useMemo(() => {
    const set = new Set();
    variants.forEach((v) => { if (v.color) set.add(v.color); });
    return [...set];
  }, [variants]);

  const selectedSize = selectedVariant?.size || null;
  const selectedColor = selectedVariant?.color || null;

  const sizeOptions = uniqueSizes.length > 0;
  const colorOptions = uniqueColors.length > 0;

  const handleSizeChange = (size) => {
    const idx = variants.findIndex((v) => {
      if (colorOptions && selectedColor) return v.size === size && v.color === selectedColor;
      if (colorOptions) return v.size === size;
      return v.size === size;
    });
    if (idx !== -1) onVariantChange(idx);
  };

  const handleColorChange = (color) => {
    const idx = variants.findIndex((v) => {
      if (sizeOptions && selectedSize) return v.color === color && v.size === selectedSize;
      if (sizeOptions) return v.color === color;
      return v.color === color;
    });
    if (idx !== -1) onVariantChange(idx);
  };

  const handleWishlist = () => {
    toggleWishlist(product.id);
  };

  const handleAddToCart = () => {
    const variantName = selectedVariant
      ? `${selectedVariant.size || ''}${selectedVariant.color ? ` / ${selectedVariant.color}` : ''}`.trim()
      : 'Default';

    addToCart({
      productId: product.id,
      productSlug: product.slug,
      sku: product.sku,
      title: product.title,
      image: product.images?.[0]?.image_path || '',
      variantId: selectedVariant?.id || '',
      variantName,
      price: activePrice,
      salePrice: activePrice,
      quantity,
    });

    setFeedback('Added to cart.');
    setTimeout(() => setFeedback(''), 2500);

    pushDataLayer('add_to_cart', {
      ecommerce: {
        items: [{
          item_id: product.sku,
          item_name: product.title,
          price: activePrice,
          item_variant: variantName,
          quantity,
        }],
      },
    });
  };

  const handleBuyNow = () => {
    const variantName = selectedVariant
      ? `${selectedVariant.size || ''}${selectedVariant.color ? ` / ${selectedVariant.color}` : ''}`.trim()
      : 'Default';

    addToCart({
      productId: product.id,
      productSlug: product.slug,
      sku: product.sku,
      title: product.title,
      image: product.images?.[0]?.image_path || '',
      variantId: selectedVariant?.id || '',
      variantName,
      price: activePrice,
      salePrice: activePrice,
      quantity,
    });

    router.push('/checkout');
  };

  const divider = <div className="border-t border-border/50 dark:border-dark-border/50" />;

  return (
    <>
      <div className="rounded-xl border border-border bg-white p-5 shadow-ambient space-y-4 dark:border-dark-border dark:bg-dark-card">
        {/* ── Title + Wishlist ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-md font-bold tracking-tight text-on-surface sm:text-xl dark:text-dark-text">
              {product.title}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {inStock ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  <span>In Stock</span> <span className='hidden'>({stockQty})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-badge-sale/10 px-2 py-0.5 text-xs font-semibold text-badge-sale">
                  <span className="h-1.5 w-1.5 rounded-full bg-badge-sale" />
                  Out of Stock
                </span>
              )}
              <span className="text-xs text-muted font-mono dark:text-dark-muted">SKU: {selectedVariant?.sku || product.sku}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleWishlist}
            className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white hover:bg-warm-sand transition active:scale-90 dark:border-dark-border dark:bg-dark-card dark:hover:bg-dark-card"
          >
            {wishlisted ? (
              <span className="material-symbols-outlined text-[18px] text-badge-sale" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
            ) : (
              <span className="material-symbols-outlined text-[18px] text-muted dark:text-dark-muted">favorite_border</span>
            )}
          </button>
        </div>

        {divider}

        {/* ── Pricing ── */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="text-2xl font-bold text-primary sm:text-3xl tracking-tight">
              ৳{activePrice.toLocaleString()}
            </p>
          </div>
          {activeOriginalPrice ? (
            <p className="text-sm text-muted line-through sm:text-base decoration-border dark:text-dark-muted dark:decoration-dark-border">
              ৳{activeOriginalPrice.toLocaleString()}
            </p>
          ) : null}
        </div>

        {/* ── Variant selector ── */}
        {variants.length > 0 && (
          <>
            {divider}
            <div className="space-y-3">
              {sizeOptions && (
                <OptionGroup
                  label="Size"
                  options={uniqueSizes}
                  selected={selectedSize}
                  onChange={handleSizeChange}
                />
              )}
              {colorOptions && (
                <OptionGroup
                  label="Color"
                  options={uniqueColors}
                  selected={selectedColor}
                  onChange={handleColorChange}
                />
              )}
              {selectedVariant && (
                <p className="text-xs text-muted dark:text-dark-muted">
                  Selected:{' '}
                  <span className="font-medium text-on-surface/70 dark:text-dark-text/70">
                    {[selectedVariant.size, selectedVariant.color].filter(Boolean).join(' / ') || `Variant ${variantIndex + 1}`}
                  </span>
                </p>
              )}
            </div>
          </>
        )}

        {/* ── Quantity ── */}
        <>
          {divider}
          <div className="flex items-center justify-between gap-3">
            <p className="font-label-caps text-[0.65rem] text-muted dark:text-dark-muted">Qty</p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setQuantity((v) => Math.max(1, v - 1))}
                disabled={quantity <= 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-base text-on-surface/70 hover:border-primary/50 active:scale-90 transition disabled:opacity-40 disabled:cursor-not-allowed dark:border-dark-border dark:bg-dark-card dark:text-dark-text/70"
              >
                <span className="material-symbols-outlined text-[18px]">remove</span>
              </button>
              <span className="w-8 text-center text-lg font-bold text-on-surface tabular-nums dark:text-dark-text">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((v) => v + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-base text-on-surface/70 hover:border-primary/50 active:scale-90 transition dark:border-dark-border dark:bg-dark-card dark:text-dark-text/70"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          </div>
        </>

        {/* ── Buttons ── */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!inStock}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-sm font-bold transition active:scale-[0.98] ${
              inStock
                ? 'bg-[#6d28d9] text-white shadow-[0_6px_18px_-4px_rgba(109,40,217,0.45)] hover:bg-[#5b21b6] hover:shadow-[0_8px_24px_-4px_rgba(109,40,217,0.6)] dark:bg-[#ff6b6b] dark:text-[#3b0000] dark:shadow-[0_6px_18px_-4px_rgba(255,107,107,0.5)] dark:hover:bg-[#ff8d8d] dark:hover:text-[#2b0505]'
                : 'cursor-not-allowed bg-border text-muted dark:bg-dark-border dark:text-dark-muted'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
            {inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
          {feedback ? (
            <p className="animate-fade-in text-center text-sm font-semibold text-success bg-success/10 rounded-lg py-1.5">
              {feedback}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!inStock}
              className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold transition active:scale-[0.98] ${
                inStock
                  ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-white shadow-[0_6px_18px_-4px_rgba(245,158,11,0.5)] hover:brightness-105 hover:shadow-[0_8px_24px_-4px_rgba(249,115,22,0.65)] dark:from-amber-300 dark:via-orange-400 dark:to-red-400 dark:shadow-[0_6px_18px_-4px_rgba(251,146,60,0.45)] dark:hover:brightness-110'
                  : 'cursor-not-allowed bg-border text-muted dark:bg-dark-border dark:text-dark-muted'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">bolt</span>
              Buy Now
            </button>
            <button
              type="button"
              onClick={() => {
                const variantLabel = selectedVariant
                  ? [selectedVariant.size, selectedVariant.color].filter(Boolean).join(' / ')
                  : '';
                const lines = [
                  `I want to order: ${product.title}`,
                  variantLabel ? `Variant: ${variantLabel}` : '',
                  `Price: ৳${activePrice.toLocaleString()}`,
                  `Qty: ${quantity}`,
                  shareUrl,
                ].filter(Boolean);
                const text = encodeURIComponent(lines.join('\n'));
                const phone = (whatsappNumber || '').replace(/[^0-9]/g, '');
                const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] px-5 py-3.5 text-sm font-bold text-white shadow-[0_6px_18px_-4px_rgba(37,211,102,0.5)] transition hover:brightness-105 hover:shadow-[0_8px_24px_-4px_rgba(18,140,126,0.6)] active:scale-[0.98] dark:from-[#2eea74] dark:to-[#16a38d] dark:shadow-[0_6px_18px_-4px_rgba(46,234,116,0.4)] dark:hover:brightness-110"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </button>
          </div>
        </div>

        {divider}

        <div className="flex items-center justify-between">
          <span className="font-label-caps text-[0.65rem] text-muted dark:text-dark-muted">Share</span>
          <ShareButtons url={shareUrl} title={product.title} />
        </div>
      </div>

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2.5 border-t border-border bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden dark:border-dark-border dark:bg-dark-bg/95">
        <div className="min-w-0 shrink-0">
          <p className="text-lg font-extrabold leading-none text-primary">
            ৳{activePrice.toLocaleString()}
          </p>
          {activeOriginalPrice ? (
            <p className="mt-0.5 text-[11px] font-medium leading-none text-muted line-through">
              ৳{activeOriginalPrice.toLocaleString()}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!inStock}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition active:scale-[0.98] ${
            inStock
              ? 'bg-[#6d28d9] text-white shadow-[0_6px_18px_-4px_rgba(109,40,217,0.45)] hover:bg-[#5b21b6] dark:bg-[#ff6b6b] dark:text-[#3b0000] dark:shadow-[0_6px_18px_-4px_rgba(255,107,107,0.5)] dark:hover:bg-[#ff8d8d] dark:hover:text-[#2b0505]'
              : 'cursor-not-allowed bg-border text-muted dark:bg-dark-border dark:text-dark-muted'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
          {inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </>
  );
}
