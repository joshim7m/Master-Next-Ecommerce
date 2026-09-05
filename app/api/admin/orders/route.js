import { NextResponse } from 'next/server';
import prisma from '../../../../src/lib/prisma';

export async function GET() {
  const orders = await prisma.order.findMany({
    include: { details: true, items: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(orders);
}
