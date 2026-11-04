const DEFAULT_CURRENCY = 'BDT';

export function pushDataLayer(event, data = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...data });
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[GTM] ${event}`, data);
  }
}

/**
 * Normalize any product/cart-line shape into a GA4 ecommerce item.
 *
 * Accepts either GA4 keys (`item_id`, `item_name`, …) or the app's own
 * product/cart keys (`sku`, `title`, `variantName`, …), so callers can pass
 * cart lines or product rows directly without re-mapping.
 */
export function toEcommerceItem(item = {}) {
  return {
    item_id: item.item_id ?? item.sku,
    item_name: item.item_name ?? item.title,
    price: Number(item.price ?? 0),
    item_variant: item.item_variant ?? item.variantName,
    item_category: item.item_category ?? item.category,
    quantity: Number(item.quantity ?? 1),
  };
}

/**
 * Build the ecommerce payload shared by every shopping event.
 *
 * Derives the event-level `value` (Σ price × quantity) and the Meta Pixel
 * standard-event fields (`content_ids`, `contents`, `content_type`,
 * `num_items`) from `items`, so the Meta tag inside GTM can map the event
 * without dashboard-side JavaScript. Never resets the data layer.
 */
export function buildEcommerce({ items = [], value, currency = DEFAULT_CURRENCY, ...extra } = {}) {
  const list = (Array.isArray(items) ? items : []).map(toEcommerceItem);
  const computed = value ?? list.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    currency,
    value: Math.round(Number(computed) * 100) / 100,
    items: list,
    // Meta Pixel standard-event fields:
    content_type: 'product',
    content_ids: list.map((item) => String(item.item_id)).filter(Boolean),
    contents: list
      .filter((item) => item.item_id)
      .map((item) => ({ id: String(item.item_id), quantity: item.quantity, item_price: item.price })),
    num_items: list.reduce((sum, item) => sum + item.quantity, 0),
    ...extra,
  };
}

/** Push a shopping event (`add_to_cart`, `view_item`, `purchase`, …). */
export function pushEcommerce(event, options = {}) {
  pushDataLayer(event, { ecommerce: buildEcommerce(options) });
}
