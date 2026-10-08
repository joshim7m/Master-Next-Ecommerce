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

  /* Ids we hold but can no longer resolve — deleted products, or ones since
     moved out of `publish`. They can never render, so the client is told which
     to drop rather than counting them forever. */
  const found = new Set(products.map((p) => p.id));
  const missingIds = ids.filter((id) => !found.has(id));

  return NextResponse.json({ products, missingIds });
}
