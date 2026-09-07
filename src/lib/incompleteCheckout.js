// OrderDetails / OrderItem rows reference Order with RESTRICT foreign keys,
// so child rows must be removed before the order itself.
// `db` can be the prisma client or an interactive-transaction client (tx).
export async function deleteIncompleteOrders(db, where) {
  const orders = await db.order.findMany({
    where: { ...where, orderStatus: 'incomplete' },
    select: { id: true },
  });
  const ids = orders.map((o) => o.id);
  if (ids.length === 0) return 0;

  await db.orderItem.deleteMany({ where: { orderId: { in: ids } } });
  await db.orderDetails.deleteMany({ where: { orderId: { in: ids } } });
  const result = await db.order.deleteMany({ where: { id: { in: ids } } });
  return result.count;
}
