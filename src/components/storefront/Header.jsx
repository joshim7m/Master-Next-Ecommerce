'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { loadCart } from '../../lib/cartStorage';
import { loadWishlist, pruneWishlist } from '../../lib/wishlistStorage';
import CartDrawer from './CartDrawer';
import AnnouncementBar from './AnnouncementBar';
import MobileMenuDrawer from './MobileMenuDrawer';
import CategoryMegaMenu from './CategoryMegaMenu';
import { DEFAULT_BRAND } from '../../lib/siteSettings';

const DEBOUNCE_MS = 300;

/** Grace period between the pointer leaving the trigger and the panel closing.
 *  Without it the menu snaps shut while the cursor is still crossing the gap
 *  between the header band and the panel below it. */
const MEGA_CLOSE_DELAY_MS = 140;

const MEGA_MENU_ID = 'header-categories-mega-menu';

/** Count pill shared by the cart and wishlist action icons. */
const COUNT_BADGE_CLASS =
  'absolute right-1.5 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-on-primary ring-2 ring-white dark:ring-[#151021]';

const NAV_LINKS = [
  { href: '/new-arrivals', label: 'New Arrivals' },
  { href: '/categories', label: 'Collections' },
  { href: '/hot-sales', label: 'Hot Sales' },
];

/** Shared by every desktop nav item so the dropdown trigger is styled
 *  identically to the plain links beside it. */
const NAV_LINK_CLASS =
  'group relative rounded-full px-3 py-2 font-label-caps text-[0.72rem] tracking-[0.1em] text-on-surface/70 transition hover:bg-white/80 hover:text-primary dark:text-dark-text/70 dark:hover:bg-white/5 dark:hover:text-primary';

/** The animated underline that sits under a nav item on hover. */
const NAV_UNDERLINE_CLASS =
  'absolute -bottom-0.5 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 group-hover:w-[calc(100%-24px)]';

export default function Header({ siteName, logo, mobile, announcementText, categories = [] }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentProducts, setRecentProducts] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [dark, setDark] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  /* ---------------- Collections mega-menu ---------------- */

  const megaTimerRef = useRef(null);

  const clearMegaTimer = useCallback(() => {
    if (megaTimerRef.current) {
      clearTimeout(megaTimerRef.current);
      megaTimerRef.current = null;
    }
  }, []);

  const openMega = useCallback(() => {
    clearMegaTimer();
    setMegaOpen(true);
  }, [clearMegaTimer]);

  const closeMega = useCallback(() => {
    clearMegaTimer();
    setMegaOpen(false);
  }, [clearMegaTimer]);

  /** Deferred so the pointer can travel from the trigger down into the panel
   *  without the panel unmounting underneath it. */
  const scheduleMegaClose = useCallback(() => {
    clearMegaTimer();
    megaTimerRef.current = setTimeout(() => {
      megaTimerRef.current = null;
      setMegaOpen(false);
    }, MEGA_CLOSE_DELAY_MS);
  }, [clearMegaTimer]);

  // Any navigation dismisses the panel.
  useEffect(() => {
    closeMega();
  }, [pathname, closeMega]);

  // Never leave a pending close behind on unmount.
  useEffect(() => clearMegaTimer, [clearMegaTimer]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  };

  useEffect(() => {
    const readCart = () => loadCart().reduce((s, i) => s + i.quantity, 0);
    /* `storage` covers other tabs; the in-app events cover this tab. */
    const onCart = () => setCartCount(readCart());

    /* The stored list is only ids, and ids outlive the products they point at.
       Counting it directly showed 13 against a wishlist page rendering 4, so
       the count has to come from the same resolved products the page renders —
       and any id the server can no longer resolve gets dropped on the way. */
    let cancelled = false;
    const onWishlist = async () => {
      const ids = loadWishlist();
      if (ids.length === 0) {
        if (!cancelled) setWishlistCount(0);
        return;
      }
      try {
        const res = await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setWishlistCount((data.products || []).length);
        pruneWishlist(data.missingIds);
      } catch {
        /* Offline or the request failed: fall back to the stored length so the
           badge still reflects intent rather than collapsing to zero. */
        if (!cancelled) setWishlistCount(ids.length);
      }
    };

    onCart();
    onWishlist();
    window.addEventListener('storage', onCart);
    window.addEventListener('cart-updated', onCart);
    window.addEventListener('storage', onWishlist);
    window.addEventListener('wishlist-updated', onWishlist);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', onCart);
      window.removeEventListener('cart-updated', onCart);
      window.removeEventListener('storage', onWishlist);
      window.removeEventListener('wishlist-updated', onWishlist);
    };
  }, []);

  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setMobileMenuOpen(false);
        closeMega();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeMega]);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
      fetch('/api/products/recent')
        .then((r) => r.json())
        .then(setRecentProducts)
        .catch(() => {});
    }
    if (!searchOpen) {
      setSearchQuery('');
      setResults([]);
      setSelectedIndex(-1);
      setRecentProducts([]);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (searchOpen) {
      document.body.style.overflow = 'hidden';
    } else if (!mobileMenuOpen) {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [searchOpen, mobileMenuOpen]);

  const fetchResults = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults(data);
      setSelectedIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(value), DEBOUNCE_MS);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/categories?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault();
      router.push(`/products/${results[selectedIndex].slug}`);
      setSearchOpen(false);
    }
  };

  const goToProduct = (slug) => {
    router.push(`/products/${slug}`);
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-50">
      <AnnouncementBar text={announcementText} />

      <div
        className={`relative transition-all duration-200 ${
          scrolled
            ? 'border-b border-[#e9e2fa] bg-[#f7f3ff]/90 shadow-ambient backdrop-blur-md dark:border-dark-border/70 dark:bg-[#151021]/90'
            : 'border-b border-[#e9e2fa] bg-[#f7f3ff] dark:border-dark-border dark:bg-[#151021]'
        }`}
      >
        {/* subtle hairline accent */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-primary/50 via-secondary/50 to-primary/30" />
        <div className="relative mx-auto flex h-14 max-w-[1440px] items-center gap-6 px-page-margin-mobile sm:px-4 lg:h-16 lg:gap-8 lg:px-page-margin-desktop">
          {/* Left: Brand */}
          <Link
            href="/"
            className="hidden h-12 shrink-0 items-center justify-center lg:flex"
            aria-label={siteName || DEFAULT_BRAND}
          >
            {logo ? (
              <img src={logo} alt={siteName || DEFAULT_BRAND} className="block h-full max-w-[220px] object-contain" />
            ) : (
              <span className="font-display text-xl font-bold tracking-tight text-editorial-ink dark:text-white lg:text-2xl">
                {siteName || DEFAULT_BRAND}
              </span>
            )}
          </Link>

          {/* Desktop nav links — adjacent to the logo */}
          <nav className="hidden items-center gap-3 lg:flex" aria-label="Main navigation">
            {NAV_LINKS.map((link) =>
              link.href === '/categories' ? (
                /* Collections — links to the full listing, and additionally
                   drives the category mega-menu on hover / focus / click. */
                <span
                  key={link.href}
                  className="relative"
                  onMouseEnter={openMega}
                  onMouseLeave={scheduleMegaClose}
                >
                  <Link
                    href={link.href}
                    className={NAV_LINK_CLASS}
                    aria-expanded={megaOpen}
                    aria-haspopup="true"
                    aria-controls={MEGA_MENU_ID}
                    onFocus={openMega}
                    onClick={closeMega}
                  >
                    <span className="relative flex items-center gap-1">
                      {link.label}
                      <ChevronDown
                        size={13}
                        aria-hidden="true"
                        className={`transition-transform duration-200 ${megaOpen ? 'rotate-180' : ''}`}
                      />
                    </span>
                    <span
                      className={`${NAV_UNDERLINE_CLASS} ${megaOpen ? '!w-[calc(100%-24px)]' : ''}`}
                    />
                  </Link>
                </span>
              ) : (
                <Link key={link.href} href={link.href} className={NAV_LINK_CLASS}>
                  <span className="relative flex items-center gap-0.5">
                    {link.label}
                    {link.href === '/hot-sales' && (
                      <span className="absolute -right-4 -top-2.5 flex h-5 w-5 items-center justify-center">
                        <span className="fire-ping absolute inset-0 rounded-full bg-orange-500/50" />
                        <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 shadow-[0_0_10px_rgba(249,115,22,0.7)] ring-2 ring-white dark:ring-[#151021]">
                          <span
                            className="flame-flicker material-symbols-outlined text-[12px] text-white"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            local_fire_department
                          </span>
                        </span>
                      </span>
                    )}
                  </span>
                  <span className={NAV_UNDERLINE_CLASS} />
                </Link>
              )
            )}
          </nav>

          {/* Left (mobile): hamburger + brand */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="icon-touch-target rounded-full text-on-surface transition hover:bg-warm-sand hover:text-primary dark:text-dark-text dark:hover:bg-dark-card dark:hover:text-primary"
              title="Menu"
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="material-symbols-outlined text-[24px]">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>

            <Link
              href="/"
              className="flex h-10 shrink-0 items-center justify-center"
              aria-label={siteName || DEFAULT_BRAND}
            >
              {logo ? (
                <img src={logo} alt={siteName || DEFAULT_BRAND} className="block h-full max-w-[38vw] object-contain" />
              ) : (
                <span className="font-display text-xl font-bold tracking-tight text-editorial-ink dark:text-white">
                  {siteName || DEFAULT_BRAND}
                </span>
              )}
            </Link>
          </div>

          {/* Right: action icons */}
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            {/* Search */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface/70 transition hover:bg-white/80 hover:text-primary shadow-sm dark:text-dark-text/70 dark:hover:bg-white/10 dark:hover:text-primary"
              title="Search (Ctrl+K)"
              aria-label="Search"
            >
              <span className="material-symbols-outlined text-[22px]">search</span>
            </button>

            {/* Wishlist — hidden on mobile */}
            <Link
              href="/wishlist"
              className="relative hidden h-10 w-10 items-center justify-center rounded-full text-on-surface/70 transition hover:bg-warm-sand hover:text-primary sm:flex sm:h-11 sm:w-11 dark:text-dark-text/70 dark:hover:bg-dark-card dark:hover:text-primary"
              title="Wishlist"
              aria-label={wishlistCount > 0 ? `Wishlist, ${wishlistCount} items` : 'Wishlist'}
            >
              <span className="material-symbols-outlined text-[22px]">favorite_border</span>
              {wishlistCount > 0 && (
                <span className={COUNT_BADGE_CLASS}>
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-on-surface/70 transition hover:bg-white/80 hover:text-primary shadow-sm dark:text-dark-text/70 dark:hover:bg-white/10 dark:hover:text-primary"
              title="Cart"
              aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : 'Cart'}
            >
              <span className="material-symbols-outlined text-[22px]">shopping_cart</span>
              {cartCount > 0 && (
                <span className={COUNT_BADGE_CLASS}>{cartCount > 99 ? '99+' : cartCount}</span>
              )}
            </button>

            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface/70 transition hover:bg-white/80 hover:text-primary shadow-sm dark:text-dark-text/70 dark:hover:bg-white/10 dark:hover:text-primary"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className="material-symbols-outlined text-[22px]">
                {dark ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Category mega-menu — a full-bleed bar anchored to the bottom of the
          header band. Lives here (rather than inside the nav) so `top-full`
          resolves against the whole header instead of the 32px trigger row. */}
      {megaOpen && (
        <CategoryMegaMenu
          id={MEGA_MENU_ID}
          categories={categories}
          onMouseEnter={openMega}
          onMouseLeave={scheduleMegaClose}
          onNavigate={closeMega}
        />
      )}

      {/* Mobile menu drawer — slides in from the left */}
      <MobileMenuDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        siteName={siteName}
        logo={logo}
        mobile={mobile}
      />

      {/* Search overlay */}
      {searchOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[100] bg-black/50 sm:flex sm:items-start sm:justify-center sm:pt-[15vh]"
          onClick={() => setSearchOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Search products"
        >
          <div
            className="flex h-full w-full flex-col bg-white animate-in slide-in-from-top duration-300 sm:h-auto sm:max-w-lg sm:rounded-xl sm:shadow-xl sm:animate-none dark:bg-dark-bg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search header on mobile */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-4 sm:hidden dark:border-dark-border">
              <div className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-warm-sand px-4 py-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary dark:border-dark-border dark:bg-dark-card dark:focus-within:border-primary dark:focus-within:ring-primary">
                <span className="material-symbols-outlined text-[20px] text-muted">search</span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Search products..."
                  className="flex-1 border-0 bg-transparent text-base outline-none placeholder:text-muted dark:placeholder:text-dark-muted"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="shrink-0 rounded-full p-1 text-muted hover:bg-border hover:text-on-surface dark:hover:bg-dark-border dark:hover:text-dark-text"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="shrink-0 text-sm font-semibold text-primary"
              >
                Cancel
              </button>
            </div>

            {/* Desktop search form */}
            <form onSubmit={handleSubmit} className="hidden p-4 pb-2 sm:block">
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-muted">
                  search
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Search for products in the store"
                  className="w-full rounded-lg border border-border bg-warm-sand py-3 pl-10 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-card dark:focus:border-primary dark:focus:ring-primary"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-on-surface dark:text-dark-muted dark:hover:text-dark-text"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </form>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 sm:max-h-[50vh]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : searchQuery.trim() && results.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted dark:text-dark-muted">No products found.</p>
              ) : !searchQuery.trim() && recentProducts.length > 0 ? (
                <div>
                  <p className="px-1 pt-4 pb-2 font-label-caps text-[0.65rem] text-muted dark:text-dark-muted">
                    Recent Products
                  </p>
                  <ul className="space-y-1">
                    {recentProducts.map((product) => (
                      <li key={product.id}>
                        <button
                          type="button"
                          onClick={() => goToProduct(product.slug)}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition hover:bg-warm-sand dark:hover:bg-dark-card"
                        >
                          {product.image ? (
                            <img src={product.image} alt="" className="h-12 w-12 flex-shrink-0 rounded object-cover sm:h-10 sm:w-10" />
                          ) : (
                            <div className="h-12 w-12 flex-shrink-0 rounded bg-warm-sand dark:bg-dark-card sm:h-10 sm:w-10" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{product.title}</p>
                            <p className="text-xs text-muted dark:text-dark-muted">
                              ৳{Number(product.unite_price).toLocaleString()}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : results.length > 0 ? (
                <ul className="space-y-1">
                  {results.map((product, i) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => goToProduct(product.slug)}
                        onMouseEnter={() => setSelectedIndex(i)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition sm:py-2 ${
                          i === selectedIndex
                            ? 'bg-primary/10 text-primary'
                            : 'text-on-surface hover:bg-warm-sand dark:text-dark-text dark:hover:bg-dark-card'
                        }`}
                      >
                        {product.image ? (
                          <img src={product.image} alt="" className="h-12 w-12 flex-shrink-0 rounded object-cover sm:h-10 sm:w-10" />
                        ) : (
                          <div className="h-12 w-12 flex-shrink-0 rounded bg-warm-sand dark:bg-dark-card sm:h-10 sm:w-10" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{product.title}</p>
                          <p className="text-xs text-muted dark:text-dark-muted">
                            ৳{product.price.toLocaleString()}
                            {product.originalPrice && (
                              <span className="ml-1 text-muted line-through dark:text-dark-muted">৳{product.originalPrice.toLocaleString()}</span>
                            )}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {searchQuery.trim() && results.length > 0 && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="mt-2 w-full rounded-lg border border-border py-3 text-center text-sm font-medium text-primary hover:bg-warm-sand transition sm:py-2.5 dark:border-dark-border dark:hover:bg-dark-card"
                >
                  See all results for &ldquo;{searchQuery}&rdquo;
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  );
}
