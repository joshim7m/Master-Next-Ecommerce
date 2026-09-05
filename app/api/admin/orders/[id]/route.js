import { NextResponse } from 'next/server';
import prisma from '../../../../../src/lib/prisma';

export async function GET(request, { params }) {
  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id },
        { orderNo: id },
      ],
    },
    include: { details: true, items: true, user: true },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const { orderStatus } = body;

  try {
    const order = await prisma.order.update({
      where: { id },
      data: { orderStatus },
      include: { details: true, items: true },
    });
    return NextResponse.json(order);
  } catch {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }
}
