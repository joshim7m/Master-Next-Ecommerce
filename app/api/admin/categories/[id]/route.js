import { NextResponse } from 'next/server';
import prisma from '../../../../../src/lib/prisma';

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const { name, slug, image, description } = body;
  try {
    const category = await prisma.category.update({ where: { id }, data: { name, slug, image, description } });
    return NextResponse.json(category);
  } catch {
    return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
  }
}
