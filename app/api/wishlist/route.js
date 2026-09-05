import { NextResponse } from 'next/server';
import prisma from '../../../src/lib/prisma';

export async function POST(request) {
  const { ids } = await request.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const products = await prisma.product.findMany({
    where: {
      id: { in: ids },
      status: 'publish',
    },
    include: { images: true, variants: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ products });
}
