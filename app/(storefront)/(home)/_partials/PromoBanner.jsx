import Link from 'next/link';

export default function PromoBanner({ categories = [] }) {
  const [featured, accent] = categories;
  const hasImages = Boolean(featured?.image);

  return (
    <section className="w-full py-section-gap px-page-margin-mobile md:px-page-margin-desktop max-w-[1440px] mx-auto">
      <div className="group relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-soft-blush via-white to-warm-sand shadow-ambient dark:from-dark-bg dark:via-dark-card dark:to-dark-bg">
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-0">

          {/* Image collage — mobile first (top), desktop (left) */}
          <div className="relative flex flex-col items-center justify-center px-page-margin-mobile pt-10 pb-4 md:py-0 md:pl-12 md:pr-0 md:block order-1">
            {/* Decorative blobs */}
            <div className="absolute -top-10 -right-6 h-44 w-44 rounded-full bg-primary-container/20 blur-3xl dark:bg-primary-container/10" />
            <div className="absolute -bottom-12 -left-8 h-52 w-52 rounded-full bg-secondary-container/30 blur-3xl dark:bg-secondary-container/15" />

            {hasImages ? (
              <>
                {/* New Season badge */}
                <span className="relative z-30 mb-3 inline-flex md:absolute md:top-8 md:left-14 md:mb-0 items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg md:z-30 dark:text-dark-bg">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/90 dark:bg-dark-bg/80" />
                  New Season
                </span>

                {/* Main portrait */}
                <div className="relative z-10 w-[74%] sm:w-[58%] md:w-[70%] lg:w-[64%] max-w-[380px] aspect-[3/4] overflow-hidden rounded-[2rem] shadow-2xl ring-4 ring-white/80 dark:ring-dark-border">
                  <img
                    src={featured.image}
                    alt={featured.name}
                    className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                    loading="lazy"
                  />
                  {/* Category label overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-5 pb-4 pt-12">
                    <Link
                      href={`/categories/${featured.slug}`}
                      className="text-sm font-semibold text-white sm:text-base"
                    >
                      {featured.name}
                    </Link>
                  </div>
                </div>

                {/* Accent image */}
                {accent?.image && (
                  <div className="absolute bottom-14 right-[6%] z-20 w-[30%] sm:w-[24%] md:bottom-auto md:right-[4%] md:top-[46%] aspect-square -rotate-2 overflow-hidden rounded-2xl shadow-2xl ring-4 ring-white/70 transition-transform duration-700 ease-out group-hover:rotate-0 dark:ring-dark-border">
                    <img
                      src={accent.image}
                      alt={accent.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-64 w-64 items-center justify-center rounded-[2rem] bg-warm-sand shadow-2xl ring-4 ring-white/80 dark:bg-dark-card dark:ring-dark-border">
                <span className="material-symbols-outlined text-[64px] text-primary/20">category</span>
              </div>
            )}
          </div>

          {/* Content — mobile (bottom), desktop (right) */}
          <div className="relative z-30 flex flex-col items-start gap-5 px-page-margin-mobile py-8 md:px-12 lg:px-16 md:py-16 order-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/70 px-4 py-1.5 dark:border-dark-border dark:bg-dark-card/60">
              <span className="h-1.5 w-1.5 rounded-full bg-primary dark:bg-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted dark:text-dark-muted">
                {hasImages ? `Featured · ${featured.name}` : 'Featured Collection'}
              </span>
            </span>

            <h2 className="font-display text-[28px] font-bold leading-[1.1] text-editorial-ink dark:text-dark-text md:text-[42px] lg:text-[46px]">
              Beautiful finds,
              <span className="block italic text-primary">made for you</span>
            </h2>

            <p className="max-w-md text-sm leading-relaxed text-muted dark:text-dark-muted md:text-base">
              {hasImages
                ? `Discover handpicked ${featured.name} styles crafted for comfort, style and everyday confidence — delivered discreetly across Bangladesh.`
                : 'Discover handpicked styles crafted for comfort, style and everyday confidence — delivered discreetly across Bangladesh.'}
            </p>

            <Link
              href={featured?.slug ? `/categories/${featured.slug}` : '/categories'}
              className="mt-3 inline-flex items-center gap-2.5 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold tracking-widest text-white uppercase shadow-lg transition-all duration-300 hover:bg-editorial-ink hover:shadow-xl active:scale-95 dark:hover:bg-primary/85 dark:hover:text-dark-bg"
            >
              {featured?.name ? `Shop ${featured.name}` : 'Explore Categories'}
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>

            {/* Trust chips */}
            <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
              {['Cash on Delivery', 'Discreet Packaging', 'Nationwide Delivery'].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted dark:text-dark-muted">
                  <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}