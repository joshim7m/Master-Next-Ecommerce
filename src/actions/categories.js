'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../lib/prisma';

export async function getCategories() {
  return prisma.category.findMany({
    include: { _count: { select: { products: true } }, parent: true },
    orderBy: { name: 'asc' },
  });
}

export async function createCategory(data) {
  const { name, slug, image, description, parentId } = data;
  if (!name || !slug) throw new Error('Name and slug are required.');
  const category = await prisma.category.create({
    data: {
      name,
      slug,
      image,
      description,
      parentId: parentId || null,
    },
  });
  revalidatePath('/admin/categories');
  return category;
}

export async function updateCategory(id, data) {
  const { name, slug, image, description, parentId } = data;
  const category = await prisma.category.update({
    where: { id },
    data: {
      name,
      slug,
      image,
      description,
      parentId: parentId || null,
    },
  });
  revalidatePath('/admin/categories');
  return category;
}

export async function deleteCategory(id) {
  await prisma.category.delete({ where: { id } });
  revalidatePath('/admin/categories');
}
