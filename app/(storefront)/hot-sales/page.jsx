import prisma from '../../../src/lib/prisma';
import TrendingCard from '../../../src/components/storefront/TrendingCard';

export const metadata = {
  title: 'Hot Sales',
  description:
    'Explore our featured products — handpicked favourites at the best prices, cash on delivery and discreet shipping across Bangladesh.',
};

export const dynamic = 'force-dynamic';

const MIN_PRODUCTS = 20;

export default async function HotSalesPage() {
  const featured = await prisma.product.findMany({
    where: { status: 'publish', featured: true, images: { some: {} } },
    include: { images: true, variants: true },
    orderBy: { createdAt: 'desc' },
  });

  const featuredIds = featured.map((p) => p.id);
  const remaining = MIN_PRODUCTS - featured.length;

  let recent = [];
  if (remaining > 0) {
    recent = await prisma.product.findMany({
      where: { status: 'publish', featured: false, images: { some: {} }, NOT: { id: { in: featuredIds } } },
      include: { images: true, variants: true },
      orderBy: { createdAt: 'desc' },
      take: remaining,
    });
  }

  const products = [...featured, ...recent];

  const serialized = JSON.parse(JSON.stringify(products));

  const avgDiscount =
    products.length > 0
      ? Math.round(
          products.reduce((sum, p) => {
            const orig = Number(p.unite_price);
            const sale = Number(p.sale_price);
            if (!orig || !sale) return sum;
            return sum + Math.round(((orig - sale) / orig) * 100);
          }, 0) / products.length
        )
      : 0;

  return (
    <section className="mx-auto max-w-[1440px] px-page-margin-mobile md:px-page-margin-desktop py-6 sm:py-12">
      {/* Hero banner */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#ae2f34] via-[#c94f54] to-[#7a1620] shadow-ambient sm:mb-8">
        <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-secondary/30 blur-3xl" />
        <div className="relative z-10 flex flex-col items-start gap-4 px-6 py-10 sm:px-10 sm:py-16 lg:px-14">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2-6.3-4.5-6.3 4.5L8 13.8 2 9.2h7.6z" />
            </svg>
            Curated for you
          </span>
          <h1 className="font-display text-3xl font-bold leading-tight text-white sm:text-5xl">
            Hot Sales
          </h1>
          <p className="max-w-lg text-sm text-white/85 sm:text-base">
            Featured pieces with up to {avgDiscount || '40'}% off — comfort and style for every
            occasion, delivered discreetly across Bangladesh.
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl bg-white/15 px-4 py-2 text-white backdrop-blur-sm">
              <span className="block text-lg font-bold leading-none">{products.length}</span>
              <span className="text-[11px] uppercase tracking-wider text-white/80">Deals live</span>
            </div>
            {avgDiscount > 0 && (
              <div className="rounded-xl bg-white/15 px-4 py-2 text-white backdrop-blur-sm">
                <span className="block text-lg font-bold leading-none">{avgDiscount}%</span>
                <span className="text-[11px] uppercase tracking-wider text-white/80">Avg. off</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-white px-6 py-16 text-center dark:border-dark-border dark:bg-dark-card">
          <span className="material-symbols-outlined mb-4 text-[48px] text-muted/30 dark:text-dark-muted/30">
            local_fire_department
          </span>
          <p className="text-muted dark:text-dark-muted">No products available yet — check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 md:gap-6">
          {serialized.map((product, i) => (
            <div key={product.id} className="animate-fade-in">
              <TrendingCard product={product} index={i} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}