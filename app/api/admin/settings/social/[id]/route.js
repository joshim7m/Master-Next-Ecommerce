import { NextResponse } from 'next/server';
import prisma from '../../../../../../src/lib/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, url, icon, order, isActive } = body;

    const link = await prisma.socialLink.update({
      where: { id },
      data: { name, url, icon, order, isActive },
    });

    return NextResponse.json(link);
  } catch (error) {
    console.error('Error updating social link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.socialLink.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting social link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
