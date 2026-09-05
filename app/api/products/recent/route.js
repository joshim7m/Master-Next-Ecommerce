import { NextResponse } from 'next/server';
import prisma from '../../../../src/lib/prisma';

export async function GET() {
  const products = await prisma.product.findMany({
    where: { status: 'publish' },
    include: { images: { take: 1 } },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });

  const mapped = products.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    unite_price: Number(p.unite_price),
    image: p.images?.[0]?.image_path || null,
  }));

  return NextResponse.json(mapped);
}
