'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function CategoryTile({ cat }) {
  const hasImage = Boolean(cat.image);
  const count = cat._count?.products;

  return (
    <Link
      href={`/categories/${cat.slug}`}
      title={cat.name}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-ambient transition-all duration-300 hover:-translate-y-1 hover:shadow-ambient-lg dark:border-dark-border dark:bg-dark-card"
    >
      <div className="image-hover-zoom relative aspect-square w-full overflow-hidden bg-warm-sand dark:bg-dark-card">
        {hasImage ? (
          <img
            src={cat.image}
            alt={cat.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-warm-sand to-soft-blush dark:from-dark-card dark:to-dark-bg">
            <span className="text-3xl font-bold text-muted/40 dark:text-dark-muted/40">{cat.name.charAt(0)}</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-1 p-2 text-center sm:p-3">
        <h3 className="line-clamp-2 text-xs font-semibold text-on-surface transition-colors group-hover:text-primary dark:text-dark-text dark:group-hover:text-primary">
          {cat.name}
        </h3>
        {typeof count === 'number' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
            {count} items
          </span>
        )}
      </div>
    </Link>
  );
}

function PaginationDots({ count, active, onSelect }) {
  if (count <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`Go to slide ${i + 1}`}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === active ? 'w-6 bg-primary' : 'w-1.5 bg-border hover:bg-primary/40 dark:bg-dark-border'
          }`}
        />
      ))}
    </div>
  );
}

export default function FeaturedCategories({ categories = [] }) {
  const mobileRef = useRef(null);
  const desktopRef = useRef(null);
  const [mobileActive, setMobileActive] = useState(0);
  const [desktopActive, setDesktopActive] = useState(0);

  if (!categories.length) return null;

  const mobileSlides = chunk(categories, 6); // 3 cols x 2 rows
  const desktopSlides = chunk(categories, 14); // 7 cols x 2 rows

  const goTo = (ref, i) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  const onScroll = (ref, setActive) => () => {
    const el = ref.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  const Arrow = ({ dir, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === -1 ? 'Scroll left' : 'Scroll right'}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-on-surface/70 transition hover:border-primary hover:text-primary active:scale-95 dark:border-dark-border dark:bg-dark-card dark:text-dark-text/70 dark:hover:text-primary"
    >
      <span className="material-symbols-outlined text-[20px]">{dir === -1 ? 'chevron_left' : 'chevron_right'}</span>
    </button>
  );

  return (
    <section className="mx-auto max-w-[1440px] px-page-margin-mobile py-section-gap md:px-page-margin-desktop">
      <div className="mb-stack-md flex items-end justify-between md:mb-stack-lg">
        <div>
          <h2 className="font-display text-headline-md font-bold text-on-surface md:text-headline-lg dark:text-dark-text">
            Our Categories
          </h2>
          <p className="mt-1 text-sm text-muted dark:text-dark-muted">Shop by category</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden gap-2 md:flex">
            <Arrow dir={-1} onClick={() => goTo(desktopRef, Math.max(0, desktopActive - 1))} />
            <Arrow dir={1} onClick={() => goTo(desktopRef, Math.min(desktopSlides.length - 1, desktopActive + 1))} />
          </div>
          <Link
            href="/categories"
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-primary transition hover:text-primary/80"
          >
            View All
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* Mobile: 4 cols x 2 rows, swipe + pagination dots */}
      <div className="md:hidden">
        <div
          ref={mobileRef}
          onScroll={onScroll(mobileRef, setMobileActive)}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none"
        >
          {mobileSlides.map((slide, i) => (
            <div key={`m-${i}`} className="w-full shrink-0 snap-start">
              <div className="grid grid-cols-3 gap-2">
                {slide.map((cat) => (
                  <CategoryTile key={cat.id} cat={cat} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <PaginationDots count={mobileSlides.length} active={mobileActive} onSelect={(i) => goTo(mobileRef, i)} />
      </div>

      {/* Desktop: 8 cols x 2 rows, swipe + arrows */}
      <div className="hidden md:block">
        <div
          ref={desktopRef}
          onScroll={onScroll(desktopRef, setDesktopActive)}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none"
        >
          {desktopSlides.map((slide, i) => (
            <div key={`d-${i}`} className="w-full shrink-0 snap-start">
              <div className="grid grid-cols-7 gap-5">
                {slide.map((cat) => (
                  <CategoryTile key={cat.id} cat={cat} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
