'use client';

import Link from 'next/link';

export default function Hero({ images = [] }) {
  const getImg = (index) => images[index]?.src || null;
  const getLink = (index) => images[index]?.link || '#';
  const getAlt = (index) => images[index]?.alt || 'product image';

  const fallbacks = [
    'https://lh3.googleusercontent.com/aida/AEtjO1WTTrFOC_-fWIFHxOBCL-rcWrEnXEVZLbLdfJIIraEoMSLR52tY79woRmjNGTmOwskj8RW62ljmD580eDmNraeJz3GWbR7jAZKvN5hDCqBrKcs7UBUn9UGvTUrb_n_lB1vdQ70WM5AHkx4YeFBy0HtxlhPaZGXMOoVZI7hYjD9ynw2tmzSfTpYeI4hq_Zvb976896SaQiygerZabyojxUFemv0zHNYgbRPZuoZrPiQbVF_HrCuLodBXplI',
    'https://lh3.googleusercontent.com/aida/AEtjO1UWbXsj6NEjMzMhdEvpojkFWYTl-fhaFwLhY8c6u8n8knLmhm0MCla_iOKLeob1fYmW6hqQuS2hnD1Qhf-b_wye8z7Rhpjj8y7BDbdFGOQUoXUsKIUX5xihoxpspsnJGrANu02Zs8mPl4AacsUodnBDr1y7gsnWBaNF2gU53DD-qUyai3zeR4qMPgUhHWes7FumfHeP2p5w3x_fwT4PSqISbF80lw4X9H7luxBD-kP4pgA5ymuiGisTCeQ',
    'https://lh3.googleusercontent.com/aida/AEtjO1VdhR0PGoVFeTkTN587V68mwYIJJTVI-JNhB4_2gLJ8tSpEqq41pFUrSZBlts0bxnr5W_dqy2nxm4I9JtygewlA46PkFxYOZhNsHL071CMmJ8FaB26wwwnyt_gb2y_Ooo5ccTWzOtbXna2wGoh5g2tQg2-BAiu78seZ5cbe73hXvHiFkkcpVKXFq3bOnMBzIPv_bxHSBIGXxAfgQdadr4XK9NHWl9OxKjISh2xKxUuCFUIMKhmx-gqp4Q',
    'https://lh3.googleusercontent.com/aida/AEtjO1U6uuXgbwLqLTM1ENch2ds9BUqPt2qKXUF2XA0QvN_RFaZ8_37jlMkcpT2Ako2Mi8bzLnpKES9DA14XgHIljmVPzxflvBxI-csdfueBtQfJLLIKda3OJAMpqzScnfKoKNplmCgGa_mI6oN0FUsISYwqaDFM7sUgvExutJx1S-PGZ1ahknBhZjKDk5QcK3xpBAcAvX4g08sx-nVwKlr0JVWW-cnIENTKrKXT9ajehfmBf408KwHImj3HWyc',
  ];

  const src = (i) => getImg(i) || fallbacks[i];

  return (
    <section
      className="relative mx-auto w-full max-w-[1440px] overflow-hidden rounded-3xl px-page-margin-mobile py-10 shadow-ambient md:px-page-margin-desktop md:py-14 lg:py-16 bg-gradient-to-br from-soft-blush via-white to-warm-sand dark:from-dark-bg dark:via-dark-card dark:to-dark-bg"
    >
      <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-12">

        {/* ===== Image Collage (left on desktop, top on mobile) ===== */}
        <div className="relative mx-auto w-full max-w-[540px] h-[380px] sm:h-[440px] md:h-[480px] md:max-w-none">
          {/* Decorative glow blobs */}
          <div className="absolute -top-12 -right-8 h-48 w-48 rounded-full bg-primary-container/30 dark:bg-primary-container/15 blur-3xl" />
          <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-secondary-container/40 dark:bg-secondary-container/20 blur-3xl" />

          {/* Main — tall, left (index 0) */}
          <Link
            href={getLink(0)}
            className="group absolute left-0 top-0 z-10 block h-full w-[55%] overflow-hidden rounded-3xl bg-surface shadow-xl ring-4 ring-white/90 dark:bg-dark-card dark:ring-dark-border"
          >
            <img
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt={getAlt(0)}
              src={src(0)}
            />
          </Link>

          {/* Top-right (index 1) */}
          <Link
            href={getLink(1)}
            className="group absolute right-0 top-0 z-20 block h-[46%] w-[43%] overflow-hidden rounded-2xl bg-surface shadow-lg ring-4 ring-white/90 dark:bg-dark-card dark:ring-dark-border"
          >
            <img
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt={getAlt(1)}
              src={src(1)}
            />
          </Link>

          {/* Bottom-right (index 2) — overlaps the main image for a layered collage */}
          <Link
            href={getLink(2)}
            className="group absolute bottom-0 left-[44%] z-30 block h-[46%] w-[52%] overflow-hidden rounded-2xl bg-surface shadow-lg ring-4 ring-white/90 dark:bg-dark-card dark:ring-dark-border"
          >
            <img
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt={getAlt(2)}
              src={src(2)}
            />
          </Link>

          {/* Floating testimonial / trust badge */}
          <div className="absolute bottom-4 left-4 z-40 flex items-center gap-3 rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-lg backdrop-blur-md dark:border-dark-border dark:bg-dark-card/85">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0d9488]/10 dark:bg-[#818cf8]/20">
              <svg className="h-5 w-5 text-[#0d9488] dark:text-[#818cf8]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.363 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.366-2.446a1 1 0 00-1.175 0l-3.366 2.446c-.784.57-1.838-.196-1.539-1.118l1.286-3.957a1 1 0 00-.363-1.118L2.053 9.386c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.958z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-editorial-ink dark:text-dark-text">50K+ Happy Customers</p>
              <p className="text-xs text-muted dark:text-dark-muted">4.9/5 average rating</p>
            </div>
          </div>

          {/* "New drops" pill */}
          <div className="absolute -top-3 left-6 z-40 rounded-full bg-[#0d9488] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg dark:bg-[#818cf8] dark:text-white">
            New Season
          </div>
        </div>

        {/* ===== Copy (right on desktop, below collage on mobile) ===== */}
        <div className="relative z-30 flex flex-col items-start gap-6 md:gap-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-4 py-1.5 dark:border-dark-border dark:bg-dark-card/60">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0d9488] dark:bg-[#818cf8]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted dark:text-dark-muted">
              New Season Collection
            </span>
          </div>

          <h1 className="font-display text-4xl font-bold leading-[1.05] text-editorial-ink dark:text-dark-text md:text-5xl lg:text-6xl">
            Beautiful finds,{' '}
            <span className="italic text-[#0d9488] dark:text-[#818cf8]">made for you</span>
          </h1>

          <p className="max-w-md text-base leading-relaxed text-muted dark:text-dark-muted md:text-lg">
            A sophisticated collection of fashion, lifestyle, and home essentials curated for the
            modern aesthetic — delivered discreetly across Bangladesh.
          </p>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Link
              href="#trending"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0d9488] px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:bg-[#0f766e] active:scale-95 dark:bg-[#818cf8] dark:text-white dark:hover:bg-[#a5b4fc]"
            >
              Shop Now
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/categories"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-white/80 px-7 py-3.5 text-sm font-semibold text-editorial-ink shadow-sm transition-all duration-300 hover:border-[#0d9488]/40 hover:bg-[#0d9488]/5 active:scale-95 dark:border-dark-border dark:bg-dark-card/80 dark:text-dark-text dark:hover:bg-dark-card"
            >
              Explore Categories
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
            {[
              'Cash on Delivery',
              'Discreet Packaging',
              'Nationwide Fit Guarantee',
            ].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted dark:text-dark-muted">
                <svg className="h-4 w-4 text-[#0d9488] dark:text-[#818cf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}