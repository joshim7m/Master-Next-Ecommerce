'use client';

import Link from 'next/link';
import { ChevronRight, LayoutGrid } from 'lucide-react';

/**
 * Desktop category mega-menu.
 *
 * Modelled on the reference dropdown (2inshop's `megamenu megamenu-column-4`):
 * one column per parent category, the parent's name as a linked column title,
 * and its subcategories listed underneath behind a `›` marker.
 *
 * The panel is rendered as a full-bleed bar directly beneath the header band
 * (see `Header`), so it must stay a plain presentational component — all open /
 * close state is owned by the header, which hands down the hover handlers that
 * keep the panel alive while the pointer travels from the trigger into it.
 *
 * @param {object} props
 * @param {string} props.id                 `id` for the trigger's `aria-controls`.
 * @param {{ id: string, name: string, slug: string, children: { id: string, name: string, slug: string }[] }[]} props.categories
 * @param {() => void} props.onMouseEnter   Cancels the pending close.
 * @param {() => void} props.onMouseLeave   Schedules the close.
 * @param {() => void} props.onNavigate     Fires on link activation so the panel can close.
 */
export default function CategoryMegaMenu({ id, categories = [], onMouseEnter, onMouseLeave, onNavigate }) {
  const hasCategories = categories.length > 0;

  return (
    /* Positioning layer only. It spans the header so the panel below can be
       centred, and is click-through so the gutters beside the panel do not
       swallow pointer events. Hover handling stays on the panel itself — if it
       lived here, sweeping the mouse across this strip anywhere on the page
       would open the menu. */
    <div className="pointer-events-none absolute inset-x-0 top-full hidden lg:block">
      <div
        id={id}
        role="region"
        aria-label="Shop by category"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="pointer-events-auto mx-auto w-[calc(100%-2rem)] max-w-4xl overflow-hidden rounded-2xl border border-border bg-white shadow-2xl dark:border-dark-border dark:bg-dark-card"
      >
        {/* Flex column so the bar header stays put and only the category grid
            scrolls — the "view all" escape hatch is then always reachable, even
            on a long category list. */}
        <div className="flex max-h-[70vh] flex-col">
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-3.5 dark:border-dark-border">
            <p className="flex items-center gap-2 font-label-caps text-[0.7rem] uppercase tracking-[0.14em] text-muted dark:text-dark-muted">
              <LayoutGrid size={14} className="text-primary" aria-hidden="true" />
              Shop by Category
            </p>
            <Link
              href="/categories"
              onClick={onNavigate}
              className="group inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-primary transition hover:bg-warm-sand dark:hover:bg-dark-bg dark:hover:text-primary"
            >
              View All
              <ChevronRight
                size={13}
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </div>

          {!hasCategories ? (
            <p className="shrink-0 px-5 py-10 text-center text-sm text-muted dark:text-dark-muted">
              No categories available yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 overflow-y-auto overscroll-contain px-5 py-4 sm:grid-cols-3">
              {categories.map((category) => (
                <div key={category.id} className="min-w-0">
                  {/* Column title — always a link to the category itself, even
                      when it has no subcategories of its own. */}
                  <Link
                    href={`/categories/${category.slug}`}
                    onClick={onNavigate}
                    className="group inline-flex max-w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[0.8rem] font-bold uppercase tracking-[0.06em] text-on-surface transition hover:bg-warm-sand hover:text-primary dark:text-dark-text dark:hover:bg-dark-bg dark:hover:text-primary"
                  >
                    <span className="truncate">{category.name}</span>
                    <ChevronRight
                      size={13}
                      aria-hidden="true"
                      className="shrink-0 text-primary/70 transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </Link>

                  {category.children.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {category.children.map((child) => (
                        <li key={child.id}>
                          <Link
                            href={`/categories/${child.slug}`}
                            onClick={onNavigate}
                            className="group flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted transition hover:bg-warm-sand hover:text-primary dark:text-dark-muted dark:hover:bg-dark-bg dark:hover:text-primary"
                          >
                            {/* Stands in for the reference's hand-point-right marker. */}
                            <ChevronRight
                              size={14}
                              aria-hidden="true"
                              className="mt-0.5 shrink-0 text-primary/60 transition-transform duration-200 group-hover:translate-x-0.5"
                            />
                            <span className="line-clamp-2 leading-snug">{child.name}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}