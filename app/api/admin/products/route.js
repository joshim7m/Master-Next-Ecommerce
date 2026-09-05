import { NextResponse } from 'next/server';
import prisma from '../../../../src/lib/prisma';

export async function GET() {
  const products = await prisma.product.findMany({
    include: { images: true, variants: true, categories: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(products);
}

export async function POST(request) {
  const body = await request.json();
  const { title, slug: rawSlug, description, unite_price, sale_price, sku, quantity, status, featured, categoryIds, imagePaths } = body;
  const slug = rawSlug?.trim();

  if (!title || !slug) {
    return NextResponse.json({ error: 'Title and slug are required.' }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      title,
      slug,
      description,
      unite_price: parseFloat(unite_price),
      sale_price: sale_price ? parseFloat(sale_price) : null,
      sku: sku || null,
      quantity: quantity ? parseInt(quantity) : null,
      status: status || 'draft',
      featured: Boolean(featured),
      categories: categoryIds?.length ? { connect: categoryIds.map((id) => ({ id })) } : undefined,
      images: imagePaths?.length ? { create: imagePaths.map((p) => ({ image_path: p, altText: title })) } : undefined,
    },
    include: { images: true, variants: true, categories: true },
  });

  return NextResponse.json(product, { status: 201 });
}
