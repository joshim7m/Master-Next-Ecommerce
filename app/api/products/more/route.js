import { NextResponse } from 'next/server';
import prisma from '../../../../src/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const skip = parseInt(searchParams.get('skip') || '0', 10);
  const take = parseInt(searchParams.get('take') || '6', 10);

  const products = await prisma.product.findMany({
    where: { status: 'publish' },
    include: { images: { take: 1 }, variants: { take: 1 } },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });

  const mapped = products.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    sku: p.sku,
    unite_price: Number(p.unite_price),
    sale_price: p.sale_price ? Number(p.sale_price) : null,
    images: (p.images || []).map((i) => ({ image_path: i.image_path, altText: i.altText || null })),
    variants: (p.variants || []).map((v) => ({ id: v.id, variant_name: v.variant_name || null })),
  }));

  return NextResponse.json(mapped);
}
