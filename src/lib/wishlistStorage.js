const WISHLIST_KEY = 'cabinet-closet-wishlist';

export function loadWishlist() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(WISHLIST_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveWishlist(list) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  }
  return list;
}

function notify() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('wishlist-updated'));
  }
}

export function isWishlisted(productId) {
  return loadWishlist().includes(productId);
}

export function toggleWishlist(productId) {
  const list = loadWishlist();
  const idx = list.indexOf(productId);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push(productId);
  }
  saveWishlist(list);
  notify();
  return idx < 0;
}

export function clearWishlist() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(WISHLIST_KEY);
  }
  notify();
  return [];
}
