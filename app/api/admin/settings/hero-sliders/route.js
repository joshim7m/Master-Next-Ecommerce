import { NextResponse } from 'next/server';
import prisma from '../../../../../src/lib/prisma';

export async function GET() {
  try {
    const slides = await prisma.heroSlider.findMany({ orderBy: { order: 'asc' } });
    return NextResponse.json(slides);
  } catch (error) {
    console.error('Error fetching hero sliders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, subtitle, buttonText, buttonLink, image } = body;

    const maxOrder = await prisma.heroSlider.aggregate({ _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const slide = await prisma.heroSlider.create({
      data: { title, subtitle, buttonText, buttonLink, image, order: nextOrder },
    });

    return NextResponse.json(slide, { status: 201 });
  } catch (error) {
    console.error('Error creating hero slider:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
