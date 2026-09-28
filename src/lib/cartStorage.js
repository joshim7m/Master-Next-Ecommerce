const CART_KEY = 'cabinet-closet-cart';

export function loadCart() {
  if (typeof window === 'undefined') return [];

  try {
    return JSON.parse(window.localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }
  return cart;
}

function notify() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cart-updated'));
  }
}

export function addToCart(item) {
  const cart = loadCart();
  const existingIndex = cart.findIndex(
    (entry) => entry.productSlug === item.productSlug && entry.variantId === item.variantId,
  );

  if (existingIndex >= 0) {
    cart[existingIndex].quantity += item.quantity;
  } else {
    cart.push(item);
  }

  saveCart(cart);
  notify();
  return cart;
}

/** The identity `addToCart` merges on. Derived from the item, so it cannot drift. */
function mergeKey(item) {
  return `${item.productSlug}::${item.variantId}`;
}

/**
 * Drop the candidates the cart already holds.
 *
 * `addToCart` merges rather than appends, so re-adding a line the cart already
 * has silently raises that line's quantity instead of adding anything. Anything
 * that offers to "add" a product — the upsell bundle, a card — wants the second
 * behaviour. Callers pass items already built by `productToCartItem`, which is
 * what makes the keys comparable.
 */
export function withoutAlreadyInCart(items, cart = loadCart()) {
  const held = new Set((cart || []).map(mergeKey));
  return items.filter((item) => !held.has(mergeKey(item)));
}

export function updateCartItem(index, quantity) {
  const cart = loadCart();
  if (index < 0 || index >= cart.length) return cart;

  if (quantity <= 0) {
    cart.splice(index, 1);
  } else {
    cart[index].quantity = quantity;
  }

  saveCart(cart);
  notify();
  return cart;
}

export function removeCartItem(index) {
  const cart = loadCart();
  if (index < 0 || index >= cart.length) return cart;

  cart.splice(index, 1);
  saveCart(cart);
  notify();
  return cart;
}

export function clearCart() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(CART_KEY);
  }
  notify();
  return [];
}

/**
 * Build a cart item from a product row.
 *
 * Single definition of the cart payload shape, shared by `TrendingCard` and the
 * upsell bundle. `variantId` must keep matching `addToCart`'s merge key
 * (`productSlug` + `variantId`) or the same product would be added as two lines.
 *
 * Prefers the product's `isDefault` variant; pass `variant` explicitly to force a
 * specific one (e.g. the variant currently selected on the product page).
 */
export function productToCartItem(product, quantity = 1, variant) {
  const chosen =
    variant || product.variants?.find((v) => v.isDefault) || product.variants?.[0] || null;
  const price = Number(product.sale_price || product.unite_price || 0);

  return {
    productId: product.id,
    productSlug: product.slug,
    sku: product.sku,
    title: product.title,
    image: product.images?.[0]?.image_path || '',
    variantId: chosen ? chosen.id : 'default',
    variantName: chosen ? (chosen.options || []).filter(Boolean).join(' / ') || 'Default' : 'Default',
    price: String(price),
    salePrice: product.sale_price ? String(product.sale_price) : null,
    quantity,
  };
}
