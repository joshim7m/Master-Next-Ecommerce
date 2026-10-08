'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../lib/prisma';

function serialize(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/* ───── Pages ───── */

export async function getPages() {
  const pages = await prisma.page.findMany({ orderBy: { name: 'asc' } });
  return serialize(pages);
}

export async function getPageBySlug(slug) {
  const page = await prisma.page.findUnique({ where: { slug } });
  return serialize(page);
}

export async function createPage(data) {
  const { name, slug: rawSlug, content, metaDescription, status } = data;
  const slug = rawSlug?.trim().toLowerCase();
  if (!name?.trim() || !slug) throw new Error('Name and slug are required.');

  const page = await prisma.page.create({
    data: {
      name: name.trim(),
      slug,
      content: content || '',
      metaDescription,
      status: status || 'publish',
    },
  });
  revalidatePath('/admin/settings/pages');
  revalidatePath('/pages/[slug]');
  return serialize(page);
}

export async function updatePage(id, data) {
  const { name, slug: rawSlug, content, metaDescription, status } = data;
  const slug = rawSlug?.trim().toLowerCase();
  const existing = await prisma.page.findUnique({ where: { id } });

  const page = await prisma.page.update({
    where: { id },
    data: {
      name: name?.trim(),
      slug,
      content: content || '',
      metaDescription,
      status,
    },
  });
  revalidatePath('/admin/settings/pages');
  revalidatePath('/pages/[slug]');
  if (existing && existing.slug !== slug) revalidatePath(`/pages/${existing.slug}`);
  return serialize(page);
}

export async function deletePage(id) {
  await prisma.page.delete({ where: { id } });
  revalidatePath('/admin/settings/pages');
  revalidatePath('/pages/[slug]');
}