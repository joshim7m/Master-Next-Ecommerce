'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../lib/prisma';

function serialize(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/* ───── Blog Categories ───── */

export async function getBlogCategories() {
  const cats = await prisma.blogCategory.findMany({
    include: { _count: { select: { posts: true } } },
    orderBy: { title: 'asc' },
  });
  return serialize(cats);
}

export async function getPublishedBlogCategories() {
  const cats = await prisma.blogCategory.findMany({
    where: { status: 'publish' },
    orderBy: { title: 'asc' },
  });
  return serialize(cats);
}

export async function createBlogCategory(data) {
  const { title, slug: rawSlug, image, authorName, status } = data;
  const slug = rawSlug?.trim();
  if (!title || !slug) throw new Error('Title and slug are required.');
  const cat = await prisma.blogCategory.create({
    data: { title, slug, image, authorName, status: status || 'draft' },
  });
  revalidatePath('/admin/blog/categories');
  return serialize(cat);
}

export async function updateBlogCategory(id, data) {
  const { title, slug: rawSlug, image, authorName, status } = data;
  const slug = rawSlug?.trim();
  const cat = await prisma.blogCategory.update({
    where: { id },
    data: { title, slug, image, authorName, status },
  });
  revalidatePath('/admin/blog/categories');
  return serialize(cat);
}

export async function deleteBlogCategory(id) {
  await prisma.blogPost.deleteMany({ where: { categoryId: id } });
  await prisma.blogCategory.delete({ where: { id } });
  revalidatePath('/admin/blog/categories');
}

/* ───── Blog Posts ───── */

export async function getBlogPosts({ page = 1, perPage = 12, search = '', categoryId = '', status = '' } = {}) {
  const skip = (page - 1) * perPage;
  const where = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { tags: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (status) where.status = status;

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      include: { category: true, advertisements: { include: { advertisement: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.blogPost.count({ where }),
  ]);
  return serialize({ posts, total, totalPages: Math.ceil(total / perPage), currentPage: page });
}

export async function getBlogPost(id) {
  const post = await prisma.blogPost.findUnique({
    where: { id },
    include: { category: true, advertisements: { include: { advertisement: true } } },
  });
  return serialize(post);
}

export async function getBlogPostBySlug(slug) {
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: { category: true, advertisements: { include: { advertisement: true } } },
  });
  return serialize(post);
}

export async function createBlogPost(data) {
  const { title, slug: rawSlug, content, bannerImage, categoryId, tags, metaDescription, status, advertisementIds } = data;
  const slug = rawSlug?.trim();
  if (!title || !slug || !categoryId) throw new Error('Title, slug, and category are required.');

  const post = await prisma.blogPost.create({
    data: {
      title,
      slug,
      content: content || '',
      bannerImage,
      category: { connect: { id: categoryId } },
      tags,
      metaDescription,
      status: status || 'draft',
      advertisements: advertisementIds?.length
        ? { create: advertisementIds.map((adId) => ({ advertisementId: adId })) }
        : undefined,
    },
    include: { category: true, advertisements: { include: { advertisement: true } } },
  });
  revalidatePath('/admin/blog/posts');
  return serialize(post);
}

export async function updateBlogPost(id, data) {
  const { title, slug: rawSlug, content, bannerImage, categoryId, tags, metaDescription, status, advertisementIds } = data;
  const slug = rawSlug?.trim();

  await prisma.blogPostAdvertisement.deleteMany({ where: { blogPostId: id } });

  const post = await prisma.blogPost.update({
    where: { id },
    data: {
      title,
      slug,
      content,
      bannerImage,
      category: categoryId ? { connect: { id: categoryId } } : { disconnect: true },
      tags,
      metaDescription,
      status,
      advertisements: advertisementIds?.length
        ? { create: advertisementIds.map((adId) => ({ advertisementId: adId })) }
        : undefined,
    },
    include: { category: true, advertisements: { include: { advertisement: true } } },
  });
  revalidatePath('/admin/blog/posts');
  return serialize(post);
}

export async function deleteBlogPost(id) {
  await prisma.blogPostAdvertisement.deleteMany({ where: { blogPostId: id } });
  await prisma.blogPost.delete({ where: { id } });
  revalidatePath('/admin/blog/posts');
}

/* ───── Advertisements ───── */

export async function getAdvertisements() {
  const ads = await prisma.advertisement.findMany({
    include: { _count: { select: { blogPosts: true } } },
    orderBy: { title: 'asc' },
  });
  return serialize(ads);
}

export async function createAdvertisement(data) {
  const { title, image, text, price, productLink } = data;
  if (!title) throw new Error('Title is required.');
  const ad = await prisma.advertisement.create({
    data: {
      title,
      image,
      text,
      price: price ? parseFloat(price) : null,
      productLink,
    },
  });
  revalidatePath('/admin/blog/advertisements');
  return serialize(ad);
}

export async function updateAdvertisement(id, data) {
  const { title, image, text, price, productLink } = data;
  const ad = await prisma.advertisement.update({
    where: { id },
    data: {
      title,
      image,
      text,
      price: price ? parseFloat(price) : null,
      productLink,
    },
  });
  revalidatePath('/admin/blog/advertisements');
  return serialize(ad);
}

export async function deleteAdvertisement(id) {
  await prisma.blogPostAdvertisement.deleteMany({ where: { advertisementId: id } });
  await prisma.advertisement.delete({ where: { id } });
  revalidatePath('/admin/blog/advertisements');
}
