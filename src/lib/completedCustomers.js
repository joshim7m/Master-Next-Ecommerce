import prisma from './prisma';

/** Product name cap for the Customers report rows. */
export const CUSTOMER_PRODUCT_NAME_MAX = 60;

/**
 * Snapshot the customer the moment an order is completed — called from both
 * completion paths (manual `updateOrderStatus` and courier webhook/sync
 * `applyCourierStatus`), so the Customers report history is written regardless of
 * how the order got its final status. `orderId` is unique on the table and the
 * write is an upsert, so a webhook replay or an order flapping completed →
 * cancelled → completed cannot duplicate rows; it just refreshes the snapshot.
 *
 * `db` can be the prisma client or an interactive-transaction client (tx),
 * mirroring `deleteIncompleteOrders` in incompleteCheckout.js.
 */
export async function captureCompletedCustomer(orderId, db = prisma) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderStatus: true,
      createdAt: true,
      details: { select: { customerName: true, phoneNumber: true, shippingAddress: true } },
      items: { select: { productTitle: true }, orderBy: { createdAt: 'asc' }, take: 1 },
    },
  });
  if (!order || order.orderStatus !== 'completed') return null;

  // First line item's title, capped at 60 characters for the report row.
  const productName = (order.items[0]?.productTitle || '').slice(0, CUSTOMER_PRODUCT_NAME_MAX);

  const snapshot = {
    orderId: order.id,
    customerName: order.details?.customerName || null,
    phoneNumber: order.details?.phoneNumber || null,
    shippingAddress: order.details?.shippingAddress || '',
    productName,
    orderDate: order.createdAt,
  };

  await db.completedCustomer.upsert({
    where: { orderId: order.id },
    update: snapshot,
    create: snapshot,
  });
  return snapshot;
}
