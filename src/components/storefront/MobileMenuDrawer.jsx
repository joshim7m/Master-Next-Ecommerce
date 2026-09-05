'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { X, ChevronRight, TrendingUp, Sparkles, BadgePercent, ShoppingBag, Heart, Phone } from 'lucide-react';

const MENU_LINKS = [
  { href: '/new-arrivals', label: 'New Arrivals', icon: Sparkles },
  { href: '/categories', label: 'Collections', icon: ShoppingBag },
  { href: '/hot-sales', label: 'Hot Sales', icon: BadgePercent },
];

export default function MobileMenuDrawer({
  open,
  onClose,
  siteName,
  logo,
  mobile,
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    if (!open) return;
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        setCategories(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open]);

  const parentCats = useMemo(() => categories.filter((c) => !c.parentId), [categories]);
  const childMap = useMemo(() => {
    const map = {};
    for (const c of categories) {
      if (c.parentId) {
        if (!map[c.parentId]) map[c.parentId] = [];
        map[c.parentId].push(c);
      }
    }
    return map;
  }, [categories]);

  const toggleParent = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const closeAndGo = (href) => {
    onClose();
    router.push(href);
  };

  const isActive = (href) => {
    const path = href.split('?')[0];
    return pathname === path;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[70] bg-black/50 transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-[80] flex w-[85%] max-w-[360px] flex-col bg-gradient-to-b from-soft-blush via-white to-warm-sand shadow-2xl transition-transform duration-300 ease-out lg:hidden dark:from-dark-card dark:via-dark-bg dark:to-dark-bg dark:shadow-black/40 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile menu"
      >
        {/* Header */}
        <div className="relative flex items-center justify-between bg-gradient-to-br from-primary-container/25 via-soft-blush to-secondary-container/25 px-5 py-4 dark:from-dark-card dark:via-dark-bg dark:via-40% dark:to-dark-bg">
          <div className="min-w-0">
            {logo ? (
              <img src={logo} alt={siteName} className="h-12 max-w-[180px] object-contain" />
            ) : (
              <span className="font-display text-lg font-bold tracking-tight text-editorial-ink dark:text-white">
                {siteName}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-on-surface shadow-sm transition hover:bg-white hover:text-primary active:scale-90 dark:bg-dark-card/80 dark:text-dark-text"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Primary nav */}
          <nav className="mt-5 px-5" aria-label="Mobile main navigation">
            <p className="px-1 font-label-caps text-[0.65rem] tracking-[0.1em] text-muted dark:text-dark-muted">
              Menu
            </p>
            <ul className="mt-2 space-y-1">
              {MENU_LINKS.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <button
                    type="button"
                    onClick={() => closeAndGo(href)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition active:scale-[0.98] ${
                      isActive(href)
                        ? 'bg-primary text-on-primary'
                        : 'text-on-surface hover:bg-warm-sand dark:text-dark-text dark:hover:bg-dark-card'
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-soft-blush via-white to-warm-sand text-primary shadow-sm dark:from-dark-card dark:via-dark-bg dark:to-dark-bg dark:text-dark-text">
                      <Icon size={16} />
                    </span>
                    <span className="flex-1">{label}</span>
                    <ChevronRight size={16} className="ml-auto opacity-40" />
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Categories */}
          <div className="mt-6 px-5 pb-6">
            <p className="flex items-center gap-2 px-1 font-label-caps text-[0.65rem] tracking-[0.1em] text-muted dark:text-dark-muted">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-soft-blush via-white to-warm-sand text-primary dark:from-dark-card dark:via-dark-bg dark:to-dark-bg dark:text-dark-text">
                <TrendingUp size={12} />
              </span>
              Shop by Category
            </p>

            {loading ? (
              <div className="mt-3 space-y-2 px-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="skeleton-shimmer h-10 rounded-xl" />
                ))}
              </div>
            ) : (
              <ul className="mt-2 space-y-1">
                {parentCats.map((parent) => {
                  const children = childMap[parent.id] || [];
                  const isOpen = expanded.has(parent.id);
                  const hasChildren = children.length > 0;

                  return (
                    <li key={parent.id}>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => closeAndGo(`/categories?category=${parent.slug}`)}
                          className="flex-1 rounded-xl px-3 py-2.5 text-left text-sm text-on-surface transition hover:bg-warm-sand dark:text-dark-text dark:hover:bg-dark-card"
                        >
                          {parent.name}
                        </button>
                        {hasChildren && (
                          <button
                            type="button"
                            onClick={() => toggleParent(parent.id)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:text-primary dark:text-dark-muted"
                            aria-label={`Toggle ${parent.name} subcategories`}
                          >
                            <ChevronRight
                              size={16}
                              className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
                            />
                          </button>
                        )}
                      </div>
                      {hasChildren && (
                        <div
                          className={`grid transition-all duration-300 ease-out ${
                            isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                          }`}
                        >
                          <div className="overflow-hidden">
                            <ul className="ml-4 mt-1 space-y-0.5 border-l-2 border-border/70 pl-3 dark:border-dark-border">
                              {children.map((child) => (
                                <li key={child.id}>
                                  <button
                                    type="button"
                                    onClick={() => closeAndGo(`/categories?category=${child.slug}`)}
                                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted transition hover:bg-warm-sand hover:text-primary dark:text-dark-muted dark:hover:bg-dark-card"
                                  >
                                    {child.name}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-4 dark:border-dark-border">
          <div className="flex items-center justify-between">
            <Link
              href="/wishlist"
              onClick={onClose}
              className="flex items-center gap-2 text-sm font-medium text-on-surface transition hover:text-primary dark:text-dark-text"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-soft-blush via-white to-warm-sand text-primary dark:from-dark-card dark:via-dark-bg dark:to-dark-bg dark:text-dark-text">
                <Heart size={14} />
              </span>
              Wishlist
            </Link>
            <Link
              href="/categories"
              onClick={onClose}
              className="flex items-center gap-2 text-sm font-medium text-on-surface transition hover:text-primary dark:text-dark-text"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-soft-blush via-white to-warm-sand text-primary dark:from-dark-card dark:via-dark-bg dark:to-dark-bg dark:text-dark-text">
                <ShoppingBag size={14} />
              </span>
              Shop All
            </Link>
          </div>
          {mobile && (
            <a
              href={`tel:${mobile}`}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary transition hover:bg-editorial-ink active:scale-[0.98] dark:hover:bg-primary/85 dark:hover:text-dark-bg"
            >
              <Phone size={16} />
              Call {mobile}
            </a>
          )}
        </div>
      </aside>
    </>
  );
}