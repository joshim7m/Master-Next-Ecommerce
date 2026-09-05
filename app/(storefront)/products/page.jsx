import prisma from '../../../src/lib/prisma';
import FilterSidebar from '../(home)/_partials/FilterSidebar';
import ProductGrid from '../(home)/_partials/ProductGrid';

export const metadata = {
  title: 'All Products',
  description: 'Browse our complete collection of products.',
};

export default async function ProductsPage({ searchParams }) {
  const params = await searchParams;
  const categorySlug = params.category || null;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : null;

  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } }, children: { include: { _count: { select: { products: true } } } } },
    orderBy: { name: 'asc' },
  });

  const where = { status: 'publish' };
  if (categorySlug) {
    where.categories = { some: { slug: categorySlug } };
  }
  if (maxPrice) {
    where.unite_price = { lte: maxPrice };
  }

  const products = await prisma.product.findMany({
    where,
    include: { images: true, variants: true },
    orderBy: { createdAt: 'desc' },
  });

  const categoryImgs = await prisma.category.findMany({
    where: { NOT: { image: null } },
    select: { name: true, image: true },
  });
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
          <h1 className="text-2xl font-bold text-white drop-shadow-lg sm:text-4xl">All Products</h1>
          <p className="mt-1 text-sm text-white/80 sm:text-base">{products.length} products</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row">
        <FilterSidebar categories={categories} />
        <div className="flex-1">
          <ProductGrid products={serialized} pageSize={20} />
        </div>
      </div>
    </section>
  );
}
