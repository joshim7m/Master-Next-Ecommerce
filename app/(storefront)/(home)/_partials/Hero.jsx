'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const AUTOPLAY_MS = 5000;

export default function Hero({ slides = [] }) {
  const [active, setActive] = useState(0);
  const count = slides.length;

  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => setActive((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [count]);

  if (count === 0) return null;

  const goTo = (i) => setActive(i);
  const prev = () => setActive((i) => (i - 1 + count) % count);
  const next = () => setActive((i) => (i + 1) % count);

  const slide = slides[active] || {};

  return (
    <section
      className="bg-[#eff6ff] px-4 py-12 dark:bg-dark-card/30"
    >
      <div className='relative mx-auto w-full max-w-[1440px] overflow-hidden rounded-3xl bg-[#eff6ff]'>
        {/* Slides — stacked images with fade transition */}
        <div className="relative h-[420px] sm:h-[480px] md:h-[520px] lg:h-[560px]">
          {slides.map((s, i) => (
            <img
              key={s.image + i || i}
              alt={s.title || 'hero image'}
              src={s.image || ''}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-out ${i === active ? 'opacity-100' : 'opacity-0'}`}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          ))}

          {/* Overlays */}
          {/* <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" /> */}

          {/* Slide content — bottom-left */}
          <div className="absolute bottom-0 left-0 z-10 flex w-full flex-col items-start gap-4 p-6 pb-10 sm:gap-5 md:p-12 md:pb-14 lg:pb-16">
            <h1
              key={`title-${active}`}
              className="hidden max-w-xl font-display text-3xl font-bold leading-tight text-white animate-hero-in md:text-5xl lg:text-6xl"
            >
              {slide.title}
            </h1>
            <p
              key={`sub-${active}`}
              className="hidden max-w-lg text-sm leading-relaxed text-white/85 animate-hero-in md:text-lg"
            >
              {slide.subtitle}
            </p>
            <div className="hidden flex flex-wrap items-center gap-3">
              <Link
                href={slide.buttonLink || '#trending'}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-editorial-ink shadow-lg transition-all duration-300 hover:bg-white/90 active:scale-95"
              >
                {slide.buttonText || 'Shop Now'}
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href="/categories"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 bg-black/20 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/10 active:scale-95"
              >
                Explore Categories
              </Link>
            </div>
          </div>

          {/* Arrows — hidden on mobile, single slide */}
          {count > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous slide"
                onClick={prev}
                className="group absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/25 p-3 text-white backdrop-blur-sm transition-all duration-300 hover:bg-black/45 md:flex"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Next slide"
                onClick={next}
                className="group absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/25 p-3 text-white backdrop-blur-sm transition-all duration-300 hover:bg-black/45 md:flex"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Dots — bottom-right */}
          {count > 1 && (
            <div className="absolute bottom-10 right-6 z-20 flex items-center gap-2 md:bottom-16 md:right-12">
              {slides.map((s, i) => (
                <button
                  key={`dot-${s.image + i || i}`}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => goTo(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? 'w-8 bg-white' : 'w-3 bg-white/50 hover:bg-white/70'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
