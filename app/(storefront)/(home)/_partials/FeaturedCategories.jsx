'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Grid, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/grid';
import 'swiper/css/pagination';

function CategoryTile({ cat }) {
  const hasImage = Boolean(cat.image);
  const count = cat.count;

  return (
    <Link
      href={`/categories/${cat.slug}`}
      title={cat.name}
      className="image-hover-zoom group flex h-full w-full cursor-pointer flex-col items-center py-1"
    >
      {/* Circular image container — same hover as TrendingCard product card */}
      <div className="mb-3 h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-md transition-all duration-300 ease-out ring-offset-[#eff6ff] group-hover:-translate-y-1.5 group-hover:border-primary/40 group-hover:shadow-lg group-hover:shadow-primary/10 group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2 md:h-28 md:w-28 dark:border-dark-border dark:bg-dark-card dark:group-hover:border-primary/40 dark:ring-offset-dark-bg">
        {hasImage ? (
          <img
            src={cat.image}
            alt={cat.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-warm-sand to-soft-blush dark:from-dark-card dark:to-dark-bg">
            <span className="text-2xl font-bold text-muted/40 dark:text-dark-muted/40">
              {cat.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Title */}
      <span className="line-clamp-2 text-center text-sm font-semibold leading-snug text-on-surface transition-colors group-hover:text-primary md:text-base dark:text-dark-text dark:group-hover:text-primary">
        {cat.name}
      </span>

      {/* Product count */}
      {typeof count === 'number' && count > 0 && (
        <span className="mt-1 text-xs text-muted dark:text-dark-muted">
          {count} Items
        </span>
      )}
    </Link>
  );
}

function ArrowButton({ dir, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === -1 ? 'Scroll left' : 'Scroll right'}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-on-surface/70 transition hover:border-primary hover:text-primary active:scale-95 dark:border-dark-border dark:bg-dark-card dark:text-dark-text/70 dark:hover:text-primary"
    >
      <span className="material-symbols-outlined text-[20px]">
        {dir === -1 ? 'chevron_left' : 'chevron_right'}
      </span>
    </button>
  );
}

export default function FeaturedCategories({ categories = [] }) {
  const swiperRef = useRef(null);

  if (!categories.length) return null;

  return (
    <section className="bg-[#eff6ff] px-4 py-12 dark:bg-dark-card/30">
      <div className="relative mx-auto max-w-7xl">
        {/* Header */}
        <h2 className="text-center font-display text-xl font-bold text-on-surface md:text-2xl dark:text-dark-text">
          Our Categories
        </h2>
        <p className="mt-1 text-center text-sm text-muted dark:text-dark-muted">
          Shop by category
        </p>

        {/* Desktop arrows */}
        <div className="absolute right-0 top-1 hidden gap-2 md:flex">
          <ArrowButton dir={-1} onClick={() => swiperRef.current?.slidePrev()} />
          <ArrowButton dir={1} onClick={() => swiperRef.current?.slideNext()} />
        </div>

        {/* Two-row circular categories: 3 per row on mobile, 6 per row on desktop */}
        <Swiper
          modules={[Grid, Pagination]}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          grid={{ rows: 2, fill: 'row' }}
          slidesPerView={3}
          slidesPerGroup={3}
          spaceBetween={20}
          pagination={{ clickable: true }}
          breakpoints={{
            768: { slidesPerView: 6, slidesPerGroup: 6, spaceBetween: 24 },
          }}
          className="category-swiper mt-8"
        >
          {categories.map((cat) => (
            <SwiperSlide key={cat.id}>
              <CategoryTile cat={cat} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/categories"
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-primary transition hover:text-primary/80"
        >
          View All
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>
    </section>
  );
}
