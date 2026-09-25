'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../lib/prisma';

function serialize(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const productInclude = {
  images: true,
  variants: true,
  categories: true,
  options: { orderBy: { position: 'asc' } },
};

export async function getProducts() {
  const products = await prisma.product.findMany({
    include: productInclude,
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
  const { title, slug: rawSlug, description, specification, metaDescription, tags, unite_price, sale_price, sku, quantity, status, featured, videoUrl, categoryIds, imagePaths } = data;
  const slug = rawSlug?.trim();
  if (!title || !slug) throw new Error('Title and slug are required.');

  const product = await prisma.product.create({
    data: {
      title, slug, description,
      specification: specification || null,
      metaDescription: metaDescription || null,
      tags: tags || null,
      videoUrl: videoUrl || null,
      unite_price: parseFloat(unite_price),
      sale_price: sale_price ? parseFloat(sale_price) : null,
      sku: sku || null,
      quantity: quantity ? parseInt(quantity) : null,
      status: status || 'draft',
      featured: Boolean(featured),
      categories: categoryIds?.length ? { connect: categoryIds.map((id) => ({ id })) } : undefined,
      images: imagePaths?.length ? { create: imagePaths.map((p) => ({ image_path: p, altText: title })) } : undefined,
    },
    include: productInclude,
  });

  revalidatePath('/admin/products');
  return serialize(product);
}

export async function updateProduct(id, data) {
  const { title, slug: rawSlug, description, specification, metaDescription, tags, unite_price, sale_price, sku, quantity, status, featured, videoUrl, categoryIds, imagePaths, removeImageIds, variants, removedVariantIds, options } = data;
  const slug = rawSlug?.trim();

  if (removeImageIds?.length) {
    await prisma.productImage.deleteMany({ where: { id: { in: removeImageIds }, productId: id } });
  }

  // Skip paths this product already has (e.g. a repeated save re-submitting
  // the same uploads) and dedupe within the batch itself.
  let freshImagePaths = [];
  if (imagePaths?.length) {
    const existingPaths = new Set(
      (await prisma.productImage.findMany({ where: { productId: id }, select: { image_path: true } })).map((r) => r.image_path)
    );
    freshImagePaths = [...new Set(imagePaths)].filter((p) => p && !existingPaths.has(p));
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
          options: Array.isArray(v.options) ? v.options.filter(Boolean) : [],
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
          options: Array.isArray(v.options) ? v.options.filter(Boolean) : [],
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
      specification: specification || null,
      metaDescription: metaDescription || null,
      tags: tags || null,
      videoUrl: videoUrl || null,
      unite_price: parseFloat(unite_price),
      sale_price: sale_price ? parseFloat(sale_price) : null,
      sku: sku || null,
      quantity: quantity ? parseInt(quantity) : null,
      status: status || 'draft',
      featured: Boolean(featured),
      categories: categoryIds?.length ? { set: categoryIds.map((id) => ({ id })) } : { set: [] },
      images: freshImagePaths.length ? { create: freshImagePaths.map((p) => ({ image_path: p, altText: title })) } : undefined,
    },
    include: productInclude,
  });

  if (options) {
    const named = options
      .map((o) => (typeof o === 'string' ? o : o?.name))
      .map((name) => (name || '').trim())
      .filter(Boolean)
      .slice(0, 3);
    await prisma.productOption.deleteMany({ where: { productId: id } });
    if (named.length) {
      await prisma.productOption.createMany({
        data: named.map((name, position) => ({ productId: id, name, position })),
      });
    }
  }

  revalidatePath('/admin/products');
  return serialize(product);
}

export async function getProduct(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });
  return serialize(product);
}

export async function deleteProduct(id) {
  await prisma.productImage.deleteMany({ where: { productId: id } });
  await prisma.productVariant.deleteMany({ where: { productId: id } });
  await prisma.productOption.deleteMany({ where: { productId: id } });
  await prisma.product.delete({ where: { id } });
  revalidatePath('/admin/products');
}
