import { NextResponse } from 'next/server';
import prisma from '../../../../src/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const deviceHash = searchParams.get('deviceHash');

  if (!deviceHash) {
    return NextResponse.json({ blocked: false });
  }

  const blocked = await prisma.blockedDevice.findUnique({
    where: { deviceHash },
  });

  return NextResponse.json({ blocked: !!blocked });
}
