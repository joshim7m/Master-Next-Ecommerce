'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../lib/prisma';
import { CATEGORY_ORDER_BY } from '../lib/categoryOrder';

/**
 * Normalise a submitted order number.
 *
 * `null` means "not supplied" — the caller then leaves the stored value alone
 * (or appends to the end when creating). Anything non-numeric is rejected and
 * anything negative is clamped, because this is a plain number field and a
 * stray keystroke must never be able to break the list.
 */
function parseSortOrder(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.trunc(n));
}

export async function getCategories() {
  return prisma.category.findMany({
    include: { _count: { select: { products: true } }, parent: true },
    orderBy: CATEGORY_ORDER_BY,
  });
}

/** The number a new category gets when the form leaves the field empty. */
async function getNextSortOrder() {
  const last = await prisma.category.findFirst({
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? 0) + 1;
}

export async function createCategory(data) {
  const { name, slug, image, description, parentId } = data;
  if (!name || !slug) throw new Error('Name and slug are required.');
  const parsed = parseSortOrder(data.sortOrder);
  const category = await prisma.category.create({
    data: {
      name,
      slug,
      image,
      description,
      parentId: parentId || null,
      // A new category with no number lands at the end of the list, so the
      // owner's numbering is never silently overwritten.
      sortOrder: parsed ?? (await getNextSortOrder()),
    },
  });
  revalidatePath('/admin/categories');
  revalidatePath('/categories');
  // The storefront header mega-menu and home grids read the category table
  // through the storefront layout — bust its cache so sortOrder/name/image
  // changes are visible without a full redeploy.
  revalidatePath('/', 'layout');
  return category;
}

export async function updateCategory(id, data) {
  const { name, slug, image, description, parentId } = data;
  const parsed = parseSortOrder(data.sortOrder);
  const category = await prisma.category.update({
    where: { id },
    data: {
      name,
      slug,
      image,
      description,
      parentId: parentId || null,
      // A blank number in the form means "leave it as it is" — it must never
      // reset a category's position to 0.
      ...(parsed === null ? {} : { sortOrder: parsed }),
    },
  });
  revalidatePath('/admin/categories');
  revalidatePath('/categories');
  // Bust the storefront layout cache so the header mega-menu picks up the
  // new sortOrder / name immediately.
  revalidatePath('/', 'layout');
  return category;
}

export async function deleteCategory(id) {
  await prisma.category.delete({ where: { id } });
  revalidatePath('/admin/categories');
  revalidatePath('/categories');
  // Bust the storefront layout cache so the header mega-menu drops the row.
  revalidatePath('/', 'layout');
}
