import { NextResponse } from 'next/server';
import prisma from '../../../../../../src/lib/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, subtitle, buttonText, buttonLink, image, order, isActive } = body;

    const slide = await prisma.heroSlider.update({
      where: { id },
      data: { title, subtitle, buttonText, buttonLink, image, order, isActive },
    });

    return NextResponse.json(slide);
  } catch (error) {
    console.error('Error updating hero slider:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.heroSlider.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting hero slider:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
