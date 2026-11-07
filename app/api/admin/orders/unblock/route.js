import { NextResponse } from 'next/server';
import prisma from '../../../../../src/lib/prisma';

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const deviceHash = searchParams.get('deviceHash');

  if (!deviceHash) {
    return NextResponse.json({ error: 'Device hash is required.' }, { status: 400 });
  }

  // Capture the orderNo before deleting the blocklist row — that's the order
  // the block API marked as `blocked`.
  const blockedRows = await prisma.blockedDevice.findMany({
    where: { deviceHash },
    select: { orderNo: true },
  });

  await prisma.blockedDevice.deleteMany({
    where: { deviceHash },
  });

  // Unblock frees the device AND returns the order to the review flow
  // (pending). Only an order still sitting in `blocked` gets reset — if an
  // admin moved it on manually we leave their choice alone.
  try {
    const orderNo = blockedRows.find((r) => r.orderNo)?.orderNo;
    if (orderNo) {
      await prisma.order.updateMany({
        where: { orderNo, orderStatus: 'blocked' },
        data: { orderStatus: 'pending' },
      });
    } else {
      const latest = await prisma.order.findFirst({
        where: { details: { deviceHash }, orderStatus: 'blocked' },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (latest) {
        await prisma.order.update({ where: { id: latest.id }, data: { orderStatus: 'pending' } });
      }
    }
  } catch (err) {
    console.error('Failed to reset order status to pending:', err);
  }

  return NextResponse.json({ success: true });
}
