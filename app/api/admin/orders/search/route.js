import { NextResponse } from 'next/server';
import prisma from '../../../../../src/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';

  if (!q) {
    return NextResponse.json([]);
  }

  const orders = await prisma.order.findMany({
    where: {
      orderNo: { contains: q, mode: 'insensitive' },
    },
    select: {
      id: true,
      orderNo: true,
      orderStatus: true,
      total: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });

  return NextResponse.json(orders);
}
