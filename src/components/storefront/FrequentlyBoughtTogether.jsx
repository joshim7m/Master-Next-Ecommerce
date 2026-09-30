'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Plus, X } from 'lucide-react';
import { addToCart, loadCart, productToCartItem, withoutAlreadyInCart } from '../../lib/cartStorage';
import { pushDataLayer } from '../../lib/gtm';

/**
 * "Frequently Bought Together" cross-sell bundle.
 *
 * Two entry points share one implementation:
 *   - default  → driven by the localStorage cart (cart page, checkout summary)
 *   - PdpBundle → driven by the product on screen (product detail page)
 *
 * Recommendations come from GET /api/recommendations (curated admin upsells
 * first, automatic scoring as fallback — see src/lib/recommendations.js).
 *
 * This component is presentational-safe by design: every failure path renders
 * nothing. The project has no error.js boundaries, so a throw here would take
 * down the whole checkout page.
 */

const TAKA = '৳';

/**
 * Card chrome used where the bundle owns its own container. The product page
 * renders it as a small ad-slot box tucked under the buy box, so the padding
 * stays tight rather than growing to full-section size. Horizontal padding is
 * `px-2` below `sm` because the compact rows are the tightest thing on the
 * storefront at mobile width, and every pixel goes to the wrapped titles.
 */
const SURFACE =
  'mt-5 rounded-xl border border-border bg-white px-2 py-4 shadow-ambient sm:px-4 dark:border-dark-border dark:bg-dark-card';

/** Recommended add-ons on the product page (it has its own add-to-cart). */
const PDP_ADDON_LIMIT = 2;

function formatPrice(value) {
  return `${TAKA}${Number(value || 0).toLocaleString()}`;
}

function firstImage(product) {
  return product.images?.[0]?.image_path || '';
}

/**
 * Display pricing.
 *
 * `sale_price` is only treated as a discount when it is actually lower than
 * `unite_price`. The seeded catalogue currently has the two the wrong way round
 * on every product that has a `sale_price` (see docs/plan-upsell-bundles.md §9),
 * and rendering that as a strikethrough would show a lower "original" price than
 * the price being charged. The effective price itself still prefers
 * `sale_price`, matching `productToCartItem` and the existing product cards.
 */
function displayPricing(product) {
  const base = Number(product.unite_price || 0);
  const sale = product.sale_price ? Number(product.sale_price) : null;
  const isDiscount = sale != null && base > 0 && sale > 0 && sale < base;

  return {
    price: Number(product.sale_price || product.unite_price || 0),
    original: isDiscount ? base : null,
    discount: isDiscount ? Math.round(((base - sale) / base) * 100) : 0,
  };
}

function priceOf(product) {
  return displayPricing(product).price;
}

/* ------------------------------------------------------------------ */
/* Data fetching                                                       */
/* ------------------------------------------------------------------ */

function useUpsellAddOns({ seedIds, limit, enabled = true }) {
  const [addOns, setAddOns] = useState([]);
  const [loading, setLoading] = useState(false);
  const seedKey = useMemo(() => [...new Set(seedIds.filter(Boolean))].sort().join(','), [seedIds]);

  useEffect(() => {
    if (!enabled || !seedKey) {
      setAddOns([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/recommendations?ids=${encodeURIComponent(seedKey)}&limit=${limit}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data) => {
        if (controller.signal.aborted) return;
        setAddOns(Array.isArray(data?.products) ? data.products : []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setAddOns([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [seedKey, limit, enabled]);

  return { addOns, loading };
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function ProductThumb({ src, alt, className = '' }) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-warm-sand text-muted dark:bg-dark-bg dark:text-dark-muted ${className}`}>
        <span className="material-symbols-outlined text-[24px]">image</span>
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
}

/** Leading group: what the customer already has (cart) or is viewing (PDP). */
function SeedGroup({ items, total, density }) {
  const compact = density === 'compact';
  const visible = items.slice(0, compact ? 3 : 4);
  const overflow = items.length - visible.length;

  return (
    <div className={compact ? 'flex items-center gap-2.5' : ''}>
      <div className={compact ? 'flex shrink-0 -space-x-2' : 'flex items-center gap-2'}>
        {visible.map((item, i) => (
          <div
            key={`${item.id}-${i}`}
            className={
              compact
                ? 'relative h-11 w-11 overflow-hidden rounded-lg ring-2 ring-white dark:ring-dark-card'
                : 'h-14 w-14 shrink-0 overflow-hidden rounded-xl'
            }
          >
            <ProductThumb src={item.image} alt={item.title} className="h-full w-full" />
          </div>
        ))}
        {overflow > 0 && (
          <span
            className={
              compact
                ? 'relative flex h-11 w-11 items-center justify-center rounded-lg bg-secondary/10 text-[11px] font-bold text-secondary ring-2 ring-white dark:bg-secondary/20 dark:ring-dark-card'
                : 'flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10 text-xs font-bold text-secondary'
            }
          >
            +{overflow}
          </span>
        )}
      </div>

      <div className={compact ? 'min-w-0 flex-1' : 'mt-3'}>
        <p
          className={`font-semibold text-on-surface dark:text-dark-text ${compact ? 'line-clamp-2 text-xs leading-snug' : 'text-sm'}`}
        >
          {items.length === 1 ? (compact ? items[0].title : 'This product') : `Your cart · ${items.length} items`}
        </p>
        {items.length === 1 && !compact && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted dark:text-dark-muted">{items[0].title}</p>
        )}
        <p
          className={`mt-0.5 text-primary ${compact ? 'text-xs font-semibold' : 'text-sm font-bold'}`}
        >
          {formatPrice(total)}
        </p>
      </div>
    </div>
  );
}

function AddOnTile({ product, onAdd, added }) {
  const { price, original, discount } = displayPricing(product);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-white transition-all duration-300 hover:border-primary/40 hover:shadow-md dark:border-dark-border/60 dark:bg-dark-card">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square w-full overflow-hidden bg-warm-sand dark:bg-dark-bg">
          <ProductThumb
            src={firstImage(product)}
            alt={product.images?.[0]?.altText || product.title}
            className="h-full w-full transition-transform duration-500 group-hover:scale-105"
          />
          {discount > 0 && (
            <span className="absolute left-2 top-2 rounded-full bg-badge-sale px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              -{discount}%
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3">
        <Link href={`/products/${product.slug}`}>
          <h4 className="line-clamp-2 text-xs font-medium leading-snug text-on-surface transition-colors hover:text-primary dark:text-dark-text dark:hover:text-primary">
            {product.title}
          </h4>
        </Link>

        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate text-sm font-bold text-primary">{formatPrice(price)}</span>
            {original && (
              <span className="shrink-0 text-[11px] text-muted line-through dark:text-dark-muted">
                {formatPrice(original)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onAdd}
            disabled={added}
            aria-label={added ? `${product.title} added to cart` : `Add ${product.title} to cart`}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-90 disabled:hover:scale-100 ${
              added
                ? 'bg-success/15 text-success dark:bg-success/25'
                : 'bg-secondary/10 text-secondary hover:bg-secondary hover:text-white dark:bg-secondary/20'
            }`}
          >
            {added ? <Check size={15} strokeWidth={2.5} /> : <Plus size={15} strokeWidth={2.5} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function CompactAddOnRow({ product, onAdd, added }) {
  const { price, original, discount } = displayPricing(product);

  return (
    <div className="flex items-center gap-2.5">
      <Link
        href={`/products/${product.slug}`}
        className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-warm-sand dark:bg-dark-bg"
      >
        <ProductThumb src={firstImage(product)} alt={product.title} className="h-full w-full" />
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={`/products/${product.slug}`}>
          {/* Wraps to two lines rather than truncating: the ad box is narrow, so a
              single-line ellipsis cut almost every real title short. `min-w-0` on
              the parent (above) is what lets the clamp measure the row, not the
              viewport. */}
          <p className="line-clamp-2 text-xs font-medium leading-snug text-on-surface transition-colors hover:text-primary dark:text-dark-text dark:hover:text-primary">
            {product.title}
          </p>
        </Link>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
          <span className="text-xs font-bold text-primary">{formatPrice(price)}</span>
          {original && (
            <span className="text-[10px] text-muted line-through dark:text-dark-muted">{formatPrice(original)}</span>
          )}
          {discount > 0 && (
            <span className="rounded-full bg-badge-sale/10 px-1.5 py-px text-[9px] font-bold text-badge-sale">
              -{discount}%
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onAdd}
        disabled={added}
        aria-label={added ? `${product.title} added to cart` : `Add ${product.title} to cart`}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all ${
          added
            ? 'bg-success/15 text-success dark:bg-success/25'
            : 'bg-secondary/10 text-secondary hover:bg-secondary hover:text-white dark:bg-secondary/20'
        }`}
      >
        {added ? <Check size={13} strokeWidth={2.5} /> : <Plus size={13} strokeWidth={2.5} />}
      </button>
    </div>
  );
}

function BundleSkeleton({ density, count = 3 }) {
  const rows = Array.from({ length: Math.max(1, count) }, (_, i) => i);

  if (density === 'compact') {
    return (
      <div className="space-y-3">
        {rows.map((i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="skeleton-shimmer h-12 w-12 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton-shimmer h-2.5 w-3/4 rounded" />
              <div className="skeleton-shimmer h-2.5 w-1/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {rows.map((i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border/60 dark:border-dark-border/60">
          <div className="skeleton-shimmer aspect-square w-full" />
          <div className="space-y-2 p-3">
            <div className="skeleton-shimmer h-3 w-3/4 rounded" />
            <div className="skeleton-shimmer h-3.5 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bundle                                                              */
/* ------------------------------------------------------------------ */

export function BundleView({
  heading = 'একসাথে আরো নিতে পারেন ',
  subheading,
  seedItems = [],
  seedTotal = 0,
  addOns = [],
  onAddAll,
  onAddOne,
  addedIds = [],
  loading = false,
  density = 'comfortable',
  ctaLabel = 'সবগুলো কার্টে যোগ করুন ',
  surface = false,
  showSeedGroup = true,
  ctaIncludesSeed = false,
  count = 3,
  dismissible = false,
  onDismiss,
}) {
  const compact = density === 'compact';
  const addedSet = useMemo(() => new Set(addedIds), [addedIds]);
  const allAdded = addOns.length > 0 && addOns.every((p) => addedSet.has(p.id));
  const addOnTotal = addOns.reduce((sum, p) => sum + priceOf(p), 0);

  // The quoted total must match what the button actually charges. Compact sits
  // inside the order summary, which already lists the cart, so it reports the
  // add-on delta. The product page's box also adds the product on screen, so it
  // reports the whole bundle.
  const totalIncludesSeed = ctaIncludesSeed || !compact;
  const bundleTotal = totalIncludesSeed ? seedTotal + addOnTotal : addOnTotal;

  // Built into `body` first so the optional card chrome stays inside the
  // emptiness check — otherwise a bundle with no recommendations would leave an
  // empty bordered box on the product page.
  let body = null;

  if (loading) {
    body = (
      <div className={compact ? 'space-y-3' : 'space-y-4'}>
        <div className={compact ? 'skeleton-shimmer h-3.5 w-40 rounded' : 'skeleton-shimmer h-5 w-56 rounded'} />
        <BundleSkeleton density={density} count={count} />
      </div>
    );
  } else if (addOns.length) {
    body = (
      <div>
        <div className={compact ? 'mb-3' : 'mb-4'}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3
                className={`flex items-center gap-1.5 font-bold text-base dark:text-dark-text ${
                  compact ? 'text-base' : 'font-display text-headline-md'
                }`}
              >
                <span className={`material-symbols-outlined text-primary ${compact ? 'text-[16px]' : 'text-[22px]'}`}>
                  auto_awesome
                </span>
                {heading}
              </h3>
              {subheading && (
                <p className={`mt-1 text-muted dark:text-dark-muted ${compact ? 'text-[11px]' : 'text-sm'}`}>{subheading}</p>
              )}
            </div>

            {dismissible && (
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss recommendations"
                className={`-mr-1 -mt-0.5 flex shrink-0 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-on-surface/5 hover:text-on-surface dark:text-dark-muted dark:hover:bg-dark-surface dark:hover:text-dark-text ${
                  compact ? 'h-8 w-8' : 'h-8 w-8'
                }`}
              >
                <X size={compact ? 14 : 16} strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>

        {/* What the customer already has / is viewing */}
        {showSeedGroup && seedItems.length > 0 && (
          <div
            className={
              compact
                ? 'mb-3 flex items-center gap-2.5 rounded-xl border border-border/60 p-2 dark:border-dark-border/60'
                : 'mb-4 rounded-2xl border border-border/60 p-4 dark:border-dark-border/60'
            }
          >
            <SeedGroup items={seedItems} total={seedTotal} density={density} />
          </div>
        )}

        {/* Recommended add-ons */}
        {compact ? (
          <div className="space-y-2.5">
            {addOns.map((product) => (
              <CompactAddOnRow
                key={product.id}
                product={product}
                added={addedSet.has(product.id)}
                onAdd={() => onAddOne?.(product)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {addOns.map((product) => (
              <AddOnTile
                key={product.id}
                product={product}
                added={addedSet.has(product.id)}
                onAdd={() => onAddOne?.(product)}
              />
            ))}
          </div>
        )}

        {/* CTA */}
        <div
          className={
            compact
              ? 'mt-3 space-y-2 border-t border-border pt-3 dark:border-dark-border'
              : 'mt-4 flex flex-wrap items-center justify-between gap-3'
          }
        >
          <div className={compact ? 'flex items-center justify-between' : ''}>
            <span className={`text-muted dark:text-dark-muted ${compact ? 'text-[11px]' : 'text-sm'}`}>
              {totalIncludesSeed ? 'Bundle total' : 'Bundle adds'}
            </span>
            <span className={`font-bold text-primary ${compact ? 'text-sm' : 'ml-2 text-base'}`}>
              {formatPrice(bundleTotal)}
            </span>
          </div>

          <button
            type="button"
            onClick={onAddAll}
            disabled={allAdded}
            className={`flex items-center justify-center gap-2 rounded-xl font-semibold text-white transition-all active:scale-[0.98] disabled:cursor-default disabled:opacity-90 dark:bg-primary dark:text-on-primary ${
              compact ? 'w-full px-3 py-2.5 text-xs' : 'px-5 py-3 text-sm'
            } ${allAdded ? 'bg-success dark:bg-success dark:text-white' : 'bg-primary hover:bg-primary/90'}`}
          >
            <span className={`material-symbols-outlined ${compact ? 'text-[15px]' : 'text-[17px]'}`}>
              {allAdded ? 'check_circle' : 'add_shopping_cart'}
            </span>
            {allAdded ? 'Added to cart' : ctaLabel}
          </button>
        </div>
      </div>
    );
  }

  if (!body) return null;
  return surface ? <div className={SURFACE}>{body}</div> : body;
}

/* ------------------------------------------------------------------ */
/* Cart-driven (cart page + checkout summary)                          */
/* ------------------------------------------------------------------ */

export default function FrequentlyBoughtTogether({
  density = 'comfortable',
  limit = 3,
  surface = false,
  dismissible = false,
  hideWhenInCart = false,
}) {
  const [cart, setCart] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [addedIds, setAddedIds] = useState([]);
  const [dismissed, setDismissed] = useState(false);

  // `ownWrite` guards the synchronous cart-updated events our own addToCart
  // calls fire; `settled` stops the rail refetching once the customer has added
  // from it, so the bundle never swaps its own items out from under them.
  const ownWriteRef = useRef(false);
  const settledRef = useRef(false);

  useEffect(() => {
    const sync = () => {
      setCart(loadCart());
      setHydrated(true);
    };
    sync();

    const onCartUpdated = () => {
      if (ownWriteRef.current || settledRef.current) return;
      sync();
    };

    window.addEventListener('cart-updated', onCartUpdated);
    return () => window.removeEventListener('cart-updated', onCartUpdated);
  }, []);

  const seedIds = useMemo(
    () => [...new Set(cart.map((item) => item.productId).filter(Boolean))],
    [cart]
  );

  const { addOns, loading } = useUpsellAddOns({ seedIds, limit, enabled: hydrated });

  const seedItems = useMemo(
    () =>
      cart.map((item, i) => ({
        id: item.productId || item.productSlug || `seed-${i}`,
        title: item.title,
        image: item.image,
        price: Number(item.price ?? 0) * (item.quantity || 1),
      })),
    [cart]
  );

  const seedTotal = useMemo(
    () => seedItems.reduce((sum, item) => sum + item.price, 0),
    [seedItems]
  );

  const trackAdd = useCallback((items) => {
    pushDataLayer('add_to_cart', {
      ecommerce: {
        items: items.map((item) => ({
          item_id: item.sku,
          item_name: item.title,
          price: Number(item.price ?? 0),
          item_variant: item.variantName,
          quantity: item.quantity,
        })),
        currency: 'BDT',
      },
    });
  }, []);

  const commit = useCallback(
    (products) => {
      if (!products.length) return;
      const items = products.map((product) => productToCartItem(product));

      ownWriteRef.current = true;
      try {
        items.forEach((item) => addToCart(item));
      } finally {
        ownWriteRef.current = false;
      }
      settledRef.current = true;

      setAddedIds((prev) => [...new Set([...prev, ...products.map((p) => p.id)])]);
      trackAdd(items);
    },
    [trackAdd]
  );

  const handleAddAll = useCallback(() => commit(addOns), [addOns, commit]);
  const handleAddOne = useCallback((product) => commit([product]), [commit]);

  // The recommender already excludes everything in the cart, so an add-on can
  // only become redundant through this component's own `commit` — which is what
  // `addedIds` records. That is the same set the customer would find in the
  // cart, without a refetch that would swap the rail's remaining items.
  const visibleAddOns = useMemo(
    () => (hideWhenInCart ? addOns.filter((product) => !addedIds.includes(product.id)) : addOns),
    [addOns, addedIds, hideWhenInCart]
  );

  if (!hydrated || !cart.length || dismissed) return null;
  // Never leave an empty gap where the bundle was: the emptiness check has to
  // cover the hidden-in-cart case, not just "no recommendations".
  if (hideWhenInCart && !loading && !visibleAddOns.length) return null;

  return (
    <BundleView
      density={density}
      surface={surface}
      count={limit}
      seedItems={seedItems}
      seedTotal={seedTotal}
      addOns={visibleAddOns}
      onAddAll={handleAddAll}
      onAddOne={handleAddOne}
      addedIds={addedIds}
      loading={loading}
      dismissible={dismissible}
      onDismiss={() => setDismissed(true)}
      subheading={density === 'compact' ? undefined : 'Add these to your order and save a delivery'}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Product-detail-page driven                                          */
/* ------------------------------------------------------------------ */

export function PdpBundle({ product, selectedVariant, quantity = 1 }) {
  const [addedIds, setAddedIds] = useState([]);
  const [cart, setCart] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  const { addOns, loading } = useUpsellAddOns({
    seedIds: product?.id ? [product.id] : [],
    limit: PDP_ADDON_LIMIT,
  });

  // Tracked so the bundle can tell whether the product on screen is already in
  // the cart — both to avoid re-adding it and to quote a total that matches
  // what "Add all" actually charges. Deliberately not suppressed around our own
  // writes: after "Add all" the product genuinely *is* in the cart, and the box
  // should say so.
  useEffect(() => {
    const sync = () => {
      setCart(loadCart());
      setHydrated(true);
    };
    sync();

    window.addEventListener('cart-updated', sync);
    return () => window.removeEventListener('cart-updated', sync);
  }, []);

  const seedItems = useMemo(() => {
    if (!product) return [];
    return [
      {
        id: product.id,
        title: product.title,
        image: firstImage(product),
        price: priceOf(product) * quantity,
      },
    ];
  }, [product, quantity]);

  const commit = useCallback(
    (addOnProducts, { includeMain = false } = {}) => {
      const candidates = [
        ...(includeMain ? [productToCartItem(product, quantity, selectedVariant)] : []),
        ...addOnProducts.map((p) => productToCartItem(p)),
      ];

      // `addToCart` merges on (productSlug, variantId), so re-adding a line the
      // cart already holds does not add a second line — it silently raises that
      // line's quantity. The bundle is an "add these" affordance, never a
      // quantity bump, so anything already in the cart is dropped here.
      const items = withoutAlreadyInCart(candidates);
      if (!items.length) return;

      items.forEach((item) => addToCart(item));
      setAddedIds((prev) => [...new Set([...prev, ...addOnProducts.map((p) => p.id)])]);

      pushDataLayer('add_to_cart', {
        ecommerce: {
          items: items.map((item) => ({
            item_id: item.sku,
            item_name: item.title,
            price: Number(item.price ?? 0),
            item_variant: item.variantName,
            quantity: item.quantity,
          })),
          currency: 'BDT',
        },
      });
    },
    [product, quantity, selectedVariant]
  );

  // Only the "Add all" CTA carries the product on screen — the same
  // "buy these together" contract as before. A single row's "+" adds just that
  // add-on, matching the cart and checkout rails.
  const handleAddAll = useCallback(() => commit(addOns, { includeMain: true }), [addOns, commit]);
  const handleAddOne = useCallback((p) => commit([p]), [commit]);

  // The product on screen, in the exact form the merge key will see it.
  const mainInCart = useMemo(() => {
    if (!product || !hydrated) return false;
    const main = productToCartItem(product, quantity, selectedVariant);
    return cart.some((entry) => entry.productSlug === main.productSlug && entry.variantId === main.variantId);
  }, [product, quantity, selectedVariant, cart, hydrated]);

  if (!product) return null;

  // Renders as a small ad-slot box: the product on screen is already the
  // headline above, so the box only sells the add-ons. `ctaIncludesSeed` tracks
  // `mainInCart` — when the product is already in the cart "Add all" will not
  // re-add it, so quoting the combined bundle would overstate what is charged.
  return (
    <BundleView
      surface
      density="compact"
      count={PDP_ADDON_LIMIT}
      showSeedGroup={false}
      ctaIncludesSeed={!mainInCart}
      seedItems={seedItems}
      seedTotal={seedItems[0]?.price || 0}
      addOns={addOns}
      onAddAll={handleAddAll}
      onAddOne={handleAddOne}
      addedIds={addedIds}
      loading={loading}
      subheading="Buy these together and save a delivery"
    />
  );
}
