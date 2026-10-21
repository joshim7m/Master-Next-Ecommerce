import { NextResponse } from 'next/server';
import prisma from '../../../../src/lib/prisma';
import { CATEGORY_ORDER_BY } from '../../../../src/lib/categoryOrder';

export async function GET() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } }, parent: true },
    orderBy: CATEGORY_ORDER_BY,
  });
  return NextResponse.json(categories);
}

export async function POST(request) {
  const body = await request.json();
  const { name, slug, image, description } = body;
  if (!name || !slug) {
    return NextResponse.json({ error: 'Name and slug are required.' }, { status: 400 });
  }
  const category = await prisma.category.create({ data: { name, slug, image, description } });
  return NextResponse.json(category, { status: 201 });
}
