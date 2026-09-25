import { NextResponse } from 'next/server';
import prisma from '../../../../../src/lib/prisma';

async function getOne() {
  const banners = await prisma.promoBanner.findMany({
    orderBy: { createdAt: 'asc' },
    take: 1,
  });
  return banners[0] || null;
}

export async function GET() {
  try {
    const banner = await getOne();
    return NextResponse.json(banner);
  } catch (error) {
    console.error('Error fetching promo banner:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { image, title, subtitle, tags, buttonText, buttonLink, trustLabels, isActive } = body;

    const existing = await getOne();
    const data = {
      image: image || null,
      title: title || null,
      subtitle: subtitle || null,
      tags: tags || null,
      buttonText: buttonText || null,
      buttonLink: buttonLink || null,
      trustLabels: trustLabels || null,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    };

    const banner = existing
      ? await prisma.promoBanner.update({ where: { id: existing.id }, data })
      : await prisma.promoBanner.create({ data });

    return NextResponse.json(banner);
  } catch (error) {
    console.error('Error saving promo banner:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
