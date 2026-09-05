import prisma from '../../../src/lib/prisma';
import ProductGrid from '../(home)/_partials/ProductGrid';

export const metadata = {
  title: 'New Arrivals',
  description:
    'Browse our newest arrivals — freshly added pieces at the best prices, cash on delivery and discreet shipping across Bangladesh.',
};

export const dynamic = 'force-dynamic';

const LIMIT = 50;

export default async function NewArrivalsPage() {
  const [products, categoryImgs] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'publish', images: { some: {} } },
      include: { images: true, variants: true },
      orderBy: { createdAt: 'desc' },
      take: LIMIT,
    }),
    prisma.category.findMany({
      where: { NOT: { image: null } },
      select: { name: true, image: true },
    }),
  ]);

  const randomCat = categoryImgs.length ? categoryImgs[Math.floor(Math.random() * categoryImgs.length)] : null;
  const bannerImage = randomCat?.image;

  const serialized = JSON.parse(JSON.stringify(products));

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 sm:py-12">
      <div className="relative mb-6 aspect-[3/2] overflow-hidden rounded-2xl bg-slate-200 sm:mb-8 sm:aspect-[4/1]">
        {bannerImage ? (
          <img src={bannerImage} alt={randomCat.name || ''} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-10">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg sm:text-4xl">New Arrivals</h1>
          <p className="mt-1 text-sm text-white/80 sm:text-base">
            Freshly added, {products.length} products
          </p>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-white px-6 py-16 text-center dark:border-dark-border dark:bg-dark-card">
          <span className="material-symbols-outlined mb-4 text-[48px] text-muted/30 dark:text-dark-muted/30">
            auto_awesome
          </span>
          <p className="text-muted dark:text-dark-muted">No new arrivals yet — check back soon.</p>
        </div>
      ) : (
        <ProductGrid products={serialized} pageSize={LIMIT} />
      )}
    </section>
  );
}