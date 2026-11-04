import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
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
  const { name, slug, image, description, sortOrder } = body;
  if (!name || !slug) {
    return NextResponse.json({ error: 'Name and slug are required.' }, { status: 400 });
  }
  // Same normalisation as the server actions: numeric clamped ≥ 0, anything
  // else left to the schema default.
  const n = Number(sortOrder);
  const sortValue =
    sortOrder !== undefined && sortOrder !== null && sortOrder !== '' && Number.isFinite(n)
      ? Math.max(0, Math.trunc(n))
      : undefined;
  const category = await prisma.category.create({
    data: { name, slug, image, description, ...(sortValue === undefined ? {} : { sortOrder: sortValue }) },
  });
  // Bust the storefront layout cache so the header mega-menu shows the row.
  revalidatePath('/', 'layout');
  return NextResponse.json(category, { status: 201 });
}
