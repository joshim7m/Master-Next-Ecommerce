/**
 * Free-delivery promo (Settings → Site Config): when enabled, an order with at
 * least `minProducts` *distinct* products pays ৳0 delivery regardless of the
 * zone charge. Like the delivery zones, the server recomputes this on every
 * order — the browser never dictates a free charge. Pure helpers only, safe to
 * import from client components; the cached reader lives in
 * `getFreeDeliverySettings.js`.
 */

export const DEFAULT_FREE_DELIVERY = { enabled: false, minProducts: 2 };

/** Normalizes anything stored/sent into `{ enabled, minProducts }`. */
export function parseFreeDeliverySettings(raw) {
  const minProducts = Number(raw?.freeDeliveryMinProducts);
  return {
    enabled: Boolean(raw?.freeDeliveryEnabled),
    minProducts:
      Number.isFinite(minProducts) && minProducts >= 1
        ? Math.floor(minProducts)
        : DEFAULT_FREE_DELIVERY.minProducts,
  };
}

/** How many different products the cart contains (variants of one product = 1). */
export function countDistinctProducts(items) {
  const ids = new Set();
  for (const item of Array.isArray(items) ? items : []) {
    const id = item?.productId ?? item?.productSlug ?? item?.sku ?? item?.title;
    if (id) ids.add(String(id));
  }
  return ids.size;
}

export function isFreeDeliveryEligible(items, settings) {
  if (!settings?.enabled) return false;
  return countDistinctProducts(items) >= settings.minProducts;
}

/** The charge after the promo: ৳0 when eligible, the zone charge otherwise. */
export function applyFreeDelivery(charge, items, settings) {
  return isFreeDeliveryEligible(items, settings) ? 0 : charge;
}
