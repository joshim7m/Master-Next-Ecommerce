import { NextResponse } from 'next/server';
import prisma from '../../../../src/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const skip = parseInt(searchParams.get('skip') || '0', 10);
  const take = parseInt(searchParams.get('take') || '6', 10);

  const products = await prisma.product.findMany({
    where: { status: 'publish' },
    // All variants: the card picks the default one itself, same as
    // `productToCartItem`. Taking only the first row could hand it a
    // non-default variant and a different cart line.
    include: { images: { take: 1 }, variants: true },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });

  const mapped = products.map((p) => {
    const variants = p.variants || [];
    const chosen = variants.find((v) => v.isDefault) || variants[0] || null;

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      sku: p.sku,
      unite_price: Number(p.unite_price),
      sale_price: p.sale_price ? Number(p.sale_price) : null,
      // TrendingCard derives stock availability from this, so both the product
      // and the chosen variant's quantity have to survive serialisation.
      quantity: p.quantity,
      images: (p.images || []).map((i) => ({ image_path: i.image_path, altText: i.altText || null })),
      variants: chosen
        ? [{ id: chosen.id, options: chosen.options || [], quantity: chosen.quantity }]
        : [],
    };
  });

  return NextResponse.json(mapped);
}
