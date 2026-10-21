import { NextResponse } from 'next/server';
import prisma from '../../../src/lib/prisma';
import { CATEGORY_ORDER_BY } from '../../../src/lib/categoryOrder';

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: CATEGORY_ORDER_BY,
  });
  return NextResponse.json(categories);
}
