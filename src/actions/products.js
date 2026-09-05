'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../lib/prisma';

function serialize(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export async function getProducts() {
  const products = await prisma.product.findMany({
    include: { images: true, variants: true, categories: true },
    orderBy: { createdAt: 'desc' },
  });
  return serialize(products);
}

export async function getCategories() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });
  return serialize(categories);
}

export async function createProduct(data) {
  const { title, slug: rawSlug, description, metaDescription, tags, unite_price, sale_price, sku, quantity, status, featured, categoryIds, imagePaths } = data;
  const slug = rawSlug?.trim();
  if (!title || !slug) throw new Error('Title and slug are required.');

  const product = await prisma.product.create({
    data: {
      title, slug, description,
      metaDescription: metaDescription || null,
      tags: tags || null,
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

  revalidatePath('/admin/products');
  return serialize(product);
}

export async function updateProduct(id, data) {
  const { title, slug: rawSlug, description, metaDescription, tags, unite_price, sale_price, sku, quantity, status, featured, categoryIds, imagePaths, removeImageIds, variants, removedVariantIds } = data;
  const slug = rawSlug?.trim();

  if (removeImageIds?.length) {
    await prisma.productImage.deleteMany({ where: { id: { in: removeImageIds }, productId: id } });
  }

  if (removedVariantIds?.length) {
    await prisma.productVariant.deleteMany({ where: { id: { in: removedVariantIds }, productId: id } });
  }

  if (variants) {
    const toCreate = variants.filter((v) => !v.id);
    for (const v of toCreate) {
      await prisma.productVariant.create({
        data: {
          product: { connect: { id } },
          sku: v.sku || null,
          size: v.size || null,
          color: v.color || null,
          unite_price: v.unite_price ? parseFloat(v.unite_price) : null,
          sale_price: v.sale_price ? parseFloat(v.sale_price) : null,
          quantity: v.quantity ? parseInt(v.quantity) : 0,
          isDefault: v.isDefault || false,
          image: v.imageId ? { connect: { id: v.imageId } } : undefined,
        },
      });
    }

    const toUpdate = variants.filter((v) => v.id);
    for (const v of toUpdate) {
      await prisma.productVariant.update({
        where: { id: v.id },
        data: {
          sku: v.sku || null,
          size: v.size || null,
          color: v.color || null,
          unite_price: v.unite_price ? parseFloat(v.unite_price) : null,
          sale_price: v.sale_price ? parseFloat(v.sale_price) : null,
          quantity: v.quantity ? parseInt(v.quantity) : 0,
          isDefault: v.isDefault || false,
          image: v.imageId ? { connect: { id: v.imageId } } : { disconnect: true },
        },
      });
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      title, slug, description,
      metaDescription: metaDescription || null,
      tags: tags || null,
      unite_price: parseFloat(unite_price),
      sale_price: sale_price ? parseFloat(sale_price) : null,
      sku: sku || null,
      quantity: quantity ? parseInt(quantity) : null,
      status: status || 'draft',
      featured: Boolean(featured),
      categories: categoryIds?.length ? { set: categoryIds.map((id) => ({ id })) } : { set: [] },
      images: imagePaths?.length ? { create: imagePaths.map((p) => ({ image_path: p, altText: title })) } : undefined,
    },
    include: { images: true, variants: true, categories: true },
  });

  revalidatePath('/admin/products');
  return serialize(product);
}

export async function getProduct(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { images: true, variants: true, categories: true },
  });
  return serialize(product);
}

export async function deleteProduct(id) {
  await prisma.productImage.deleteMany({ where: { productId: id } });
  await prisma.productVariant.deleteMany({ where: { productId: id } });
  await prisma.product.delete({ where: { id } });
  revalidatePath('/admin/products');
}
