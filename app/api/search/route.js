import { NextResponse } from 'next/server';
import prisma from '../../../src/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';

  if (!q.trim()) {
    return NextResponse.json([]);
  }

  const products = await prisma.product.findMany({
    where: {
      status: 'publish',
      title: { contains: q.trim(), mode: 'insensitive' },
    },
    include: { images: true },
    take: 8,
    orderBy: { createdAt: 'desc' },
  });

  const results = products.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    price: Number(p.sale_price || p.unite_price),
    originalPrice: p.sale_price ? Number(p.unite_price) : null,
    image: p.images?.[0]?.image_path || null,
  }));

  return NextResponse.json(results);
}
