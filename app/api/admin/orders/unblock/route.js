import { NextResponse } from 'next/server';
import prisma from '../../../../../src/lib/prisma';

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const deviceHash = searchParams.get('deviceHash');

  if (!deviceHash) {
    return NextResponse.json({ error: 'Device hash is required.' }, { status: 400 });
  }

  await prisma.blockedDevice.deleteMany({
    where: { deviceHash },
  });

  return NextResponse.json({ success: true });
}
