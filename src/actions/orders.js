'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../lib/prisma';
import { deleteIncompleteOrders } from '../lib/incompleteCheckout';

function serialize(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export async function getRecentOrders(limit = 5) {
  const orders = await prisma.order.findMany({
    take: limit,
    include: { details: true },
    orderBy: { createdAt: 'desc' },
  });
  return serialize(orders);
}

export async function getDashboardStats() {
  const [productCount, categoryCount, orderCount, revenueResult] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.order.count({ where: { orderStatus: { not: 'incomplete' } } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { orderStatus: { notIn: ['cancelled', 'incomplete'] } },
    }),
  ]);
  return serialize({
    products: productCount,
    categories: categoryCount,
    orders: orderCount,
    revenue: revenueResult._sum.total ? Number(revenueResult._sum.total) : 0,
  });
}

export async function getOrders() {
  const orders = await prisma.order.findMany({
    include: { details: true, items: true, user: true },
    orderBy: { createdAt: 'desc' },
  });
  return serialize(orders);
}

export async function getOrderReport(fromISO, toISO) {
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: new Date(fromISO), lte: new Date(toISO) } },
    include: { details: true, items: true },
    orderBy: { createdAt: 'desc' },
  });
  return serialize(orders);
}

export async function getOrderByOrderNo(orderNo) {
  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: { details: true, items: true, user: true },
  });
  return serialize(order);
}

export async function getIncompleteOrders() {
  const orders = await prisma.order.findMany({
    where: { orderStatus: 'incomplete' },
    include: { details: true, items: true },
    orderBy: { updatedAt: 'desc' },
  });
  return serialize(orders);
}

export async function deleteIncompleteOrder(id) {
  const order = await prisma.order.findFirst({
    where: { id, orderStatus: 'incomplete' },
  });
  if (!order) throw new Error('Incomplete order not found');
  const deleted = await prisma.$transaction(async (tx) => {
    return deleteIncompleteOrders(tx, { id });
  });
  revalidatePath('/admin/incomplete-orders');
  return deleted;
}

export async function updateOrderStatus(id, data) {
  const order = await prisma.order.update({
    where: { id },
    data,
  });
  revalidatePath('/admin/orders');
  return serialize(order);
}

export async function updateOrderItemQuantity(itemId, quantity) {
  const item = await prisma.orderItem.update({
    where: { id: itemId },
    data: { quantity },
    include: { order: { include: { items: true, details: true } } },
  });
  const order = item.order;
  const subtotal = order.items.reduce(
    (s, i) => s + Number(i.purchasePrice) * i.quantity, 0
  );
  const deliveryCharge = Number(order.details?.deliveryCharge || 0);
  await prisma.order.update({
    where: { id: order.id },
    data: { total: subtotal + deliveryCharge },
  });
  revalidatePath('/admin/orders');
  return serialize(item);
}

export async function deleteOrderItem(itemId) {
  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { order: { include: { items: true, details: true } } },
  });
  if (!item) throw new Error('Item not found');
  const order = item.order;
  if (order.orderStatus === 'completed') throw new Error('Cannot remove items from completed orders');
  await prisma.orderItem.delete({ where: { id: itemId } });
  const remaining = order.items.filter((i) => i.id !== itemId);
  const subtotal = remaining.reduce(
    (s, i) => s + Number(i.purchasePrice) * i.quantity, 0
  );
  const deliveryCharge = Number(order.details?.deliveryCharge || 0);
  await prisma.order.update({
    where: { id: order.id },
    data: { total: subtotal + deliveryCharge },
  });
  revalidatePath('/admin/orders');
  return serialize(item);
}

export async function updateOrderDetails(orderId, data) {
  const details = await prisma.orderDetails.update({
    where: { orderId },
    data,
    include: { order: { include: { items: true } } },
  });
  if (data.deliveryCharge !== undefined) {
    const subtotal = details.order.items.reduce(
      (s, i) => s + Number(i.purchasePrice) * i.quantity, 0
    );
    const newTotal = subtotal + Number(data.deliveryCharge);
    await prisma.order.update({
      where: { id: orderId },
      data: { total: newTotal },
    });
  }
  revalidatePath('/admin/orders');
  return serialize(details);
}
