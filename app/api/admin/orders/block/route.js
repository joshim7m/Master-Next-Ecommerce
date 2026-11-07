import { NextResponse } from 'next/server';
import prisma from '../../../../../src/lib/prisma';

export async function POST(request) {
  const body = await request.json();
  const { deviceHash, orderNo, reason } = body;

  if (!deviceHash) {
    return NextResponse.json({ error: 'Device hash is required.' }, { status: 400 });
  }

  const existing = await prisma.blockedDevice.findUnique({
    where: { deviceHash },
  });

  if (existing) {
    return NextResponse.json({ error: 'This device is already blocked.' }, { status: 409 });
  }

  const blocked = await prisma.blockedDevice.create({
    data: {
      deviceHash,
      orderNo: orderNo || null,
      reason: reason || null,
    },
  });

  // Keep the order record in sync — a blocked order stays `blocked` as a
  // business record (deleteOrder refuses to delete it). Prefer the explicit
  // orderNo; otherwise fall back to the latest order placed from this device.
  // A failed lookup doesn't undo the device block itself.
  try {
    if (orderNo) {
      await prisma.order.update({ where: { orderNo }, data: { orderStatus: 'blocked' } });
    } else {
      const latest = await prisma.order.findFirst({
        where: { details: { deviceHash } },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (latest) {
        await prisma.order.update({ where: { id: latest.id }, data: { orderStatus: 'blocked' } });
      }
    }
  } catch (err) {
    console.error('Failed to set order status to blocked:', err);
  }

  return NextResponse.json({ success: true, blocked });
}
