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

/** Drop ids the server says no longer resolve, then notify if anything changed.
 *  Returns the surviving list. Safe to call with an empty `missing` — that is
 *  the common case, and it deliberately does not fire an event. */
export function pruneWishlist(missingIds = []) {
  if (!Array.isArray(missingIds) || missingIds.length === 0) return loadWishlist();
  const dead = new Set(missingIds);
  const current = loadWishlist();
  const list = current.filter((id) => !dead.has(id));
  /* Only write when something was actually dropped. Callers prune on every
     hydrate, and the second pass has nothing to remove — writing unconditionally
     would notify again and make each listener re-fetch for no reason. */
  if (list.length !== current.length) {
    saveWishlist(list);
    notify();
  }
  return list;
}
