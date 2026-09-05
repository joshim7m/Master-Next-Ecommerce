'use client';

import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function CategoryTile({ cat }) {
  return (
    <Link
      href={`/categories/${cat.slug}`}
      title={cat.name}
      className="aspect-square overflow-hidden relative group cursor-pointer bg-surface dark:bg-dark-surface ambient-shadow rounded-2xl sm:rounded-3xl block"
    >
      {cat.image ? (
        <img
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          alt={cat.name}
          src={cat.image}
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-warm-sand dark:bg-dark-card">
          <span className="material-symbols-outlined text-[40px] sm:text-[48px] text-primary/20">category</span>
        </div>
      )}
    </Link>
  );
}

export default function FeaturedCategories({ categories = [] }) {
  if (!categories.length) return null;

  const rows = categories.length > 0 ? categories : [];

  // Mobile carousel: 2 rows of 4 per view
  const mobileChunks = chunk(rows, 8);
  // Desktop carousel: 2 rows of 8 per view
  const desktopChunks = chunk(rows, 16);

  return (
    <section className="py-section-gap px-page-margin-mobile md:px-page-margin-desktop max-w-[1440px] mx-auto bg-surface-container-low dark:bg-dark-card/50">
      <div className="flex justify-between items-end mb-stack-md md:mb-stack-lg">
        <h2 className="font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg text-editorial-ink dark:text-dark-text">
          Our Categories
        </h2>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden md:flex gap-2">
            <button className="category-prev-desktop w-10 h-10 rounded-full border border-secondary text-secondary flex items-center justify-center hover:bg-secondary hover:text-white transition-colors active:scale-95">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="category-next-desktop w-10 h-10 rounded-full border border-secondary text-secondary flex items-center justify-center hover:bg-secondary hover:text-white transition-colors active:scale-95">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
          <Link
            href="/categories"
            className="font-semibold text-xs text-secondary underline hover:text-editorial-ink dark:hover:text-dark-text transition-colors uppercase tracking-widest whitespace-nowrap"
          >
            VIEW ALL
          </Link>
        </div>
      </div>

      {/* Mobile — 2 rows of 4, swipe to see more */}
      <div className="md:hidden">
        <Swiper
          modules={[Pagination]}
          pagination={{ clickable: true }}
          spaceBetween={6}
          className="category-swiper"
        >
          {mobileChunks.map((chunk, i) => (
            <SwiperSlide key={`m-${i}`} className="!h-auto">
              <div className="grid grid-cols-4 gap-2 pb-4">
                {chunk.map((cat) => (
                  <CategoryTile key={`${cat.id}-m`} cat={cat} />
                ))}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Desktop — 2 rows of 8, arrows to swipe */}
      <div className="hidden md:block">
        <Swiper
          modules={[Navigation, Pagination]}
          navigation={{ nextEl: '.category-next-desktop', prevEl: '.category-prev-desktop' }}
          pagination={{ clickable: true }}
          spaceBetween={24}
          className="category-swiper category-swiper-desktop"
        >
          {desktopChunks.map((chunk, i) => (
            <SwiperSlide key={`d-${i}`} className="!h-auto">
              <div className="grid grid-cols-8 gap-5 pb-5">
                {chunk.map((cat) => (
                  <CategoryTile key={`${cat.id}-d`} cat={cat} />
                ))}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
