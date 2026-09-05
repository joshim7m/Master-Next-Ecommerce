import { NextResponse } from 'next/server';
import prisma from '../../../../../src/lib/prisma';

export async function GET() {
  try {
    const links = await prisma.socialLink.findMany({ orderBy: { order: 'asc' } });
    return NextResponse.json(links);
  } catch (error) {
    console.error('Error fetching social links:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, url, icon } = body;

    const maxOrder = await prisma.socialLink.aggregate({ _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const link = await prisma.socialLink.create({
      data: { name, url, icon, order: nextOrder },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error('Error creating social link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
