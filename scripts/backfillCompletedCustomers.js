/**
 * One-off backfill: snapshots every order that is `completed` right now into
 * the CompletedCustomer table, skipping orders that were already captured.
 *
 * Run once after adding the table:
 *   node scripts/backfillCompletedCustomers.js
 *
 * CommonJS (like prisma/seed.js) because the project has no "type": "module";
 * it talks to the Prisma client directly instead of importing the ESM `src/`
 * helpers, and mirrors the snapshot logic of src/lib/completedCustomers.js.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const PRODUCT_NAME_MAX = 60;

async function main() {
  const completed = await prisma.order.findMany({
    where: { orderStatus: 'completed' },
    select: {
      id: true,
      createdAt: true,
      details: { select: { customerName: true, phoneNumber: true, shippingAddress: true } },
      items: { select: { productTitle: true }, orderBy: { createdAt: 'asc' }, take: 1 },
    },
    orderBy: { createdAt: 'asc' },
  });

  let captured = 0;
  for (const order of completed) {
    const snapshot = {
      orderId: order.id,
      customerName: order.details?.customerName || null,
      phoneNumber: order.details?.phoneNumber || null,
      shippingAddress: order.details?.shippingAddress || '',
      productName: (order.items[0]?.productTitle || '').slice(0, PRODUCT_NAME_MAX),
      orderDate: order.createdAt,
    };
    await prisma.completedCustomer.upsert({
      where: { orderId: order.id },
      update: snapshot,
      create: snapshot,
    });
    captured += 1;
  }

  console.log(`Completed orders: ${completed.length}, captured snapshots: ${captured}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
