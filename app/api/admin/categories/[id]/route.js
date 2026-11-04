import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '../../../../../src/lib/prisma';

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const { name, slug, image, description, sortOrder } = body;
  // A blank number means "leave it as it is" — same semantics as the server
  // actions, so a stray empty field can never reset a category's position.
  const n = Number(sortOrder);
  const parsed =
    sortOrder !== undefined && sortOrder !== null && sortOrder !== '' && Number.isFinite(n)
      ? Math.max(0, Math.trunc(n))
      : null;
  try {
    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        image,
        description,
        ...(parsed === null ? {} : { sortOrder: parsed }),
      },
    });
    // Bust the storefront layout cache so the header mega-menu reflects the
    // new sortOrder / name immediately.
    revalidatePath('/', 'layout');
    return NextResponse.json(category);
  } catch {
    return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    await prisma.category.delete({ where: { id } });
    revalidatePath('/', 'layout');
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
  }
}
