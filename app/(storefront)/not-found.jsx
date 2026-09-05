import prisma from '../../src/lib/prisma';
import NotFoundContent from './_partials/NotFoundContent';

export default async function NotFoundPage() {
  const products = await prisma.product.findMany({
    where: { status: 'publish' },
    include: { images: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const serialized = JSON.parse(JSON.stringify(products.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    price: Number(p.sale_price || p.unite_price),
    originalPrice: p.sale_price ? Number(p.unite_price) : null,
    image: p.images?.[0]?.image_path || null,
  }))));

  return <NotFoundContent allProducts={serialized} />;
}
