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
