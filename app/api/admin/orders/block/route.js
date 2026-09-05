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

  return NextResponse.json({ success: true, blocked });
}
