'use server';

import prisma from '../lib/prisma';

/*
 * Storefront order tracking — the only public order lookups in the app.
 * Two lookup paths share one input box:
 *
 *   1. Order number alone      → a minimal summary (status + date + total +
 *      courier info). Itemized contents stay hidden until the mobile number
 *      matches, so a guessed 6-digit number cannot reveal what someone got.
 *   2. Mobile number alone     → the recent orders placed with that number,
 *      newest first. The caller then opens one of them with the same number.
 *
 * `incomplete` checkout drafts are invisible on every path — an abandoned
 * form is not an order a customer should ever see. No address, no phone, no
 * user data ever comes back; these actions return customer-safe data only.
 */

/**
 * Normalize any Bangladeshi mobile input (01XXXXXXXXX, +8801XXX, 8801XXX,
 * with spaces/dashes) to the stored `01XXXXXXXXX` form, or null when it
 * cannot be one.
 */
function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return null;
  let local = digits;
  if (local.startsWith('880')) local = local.slice(3);
  if (!local.startsWith('0')) local = `0${local}`;
  return /^0(1[3-9])\d{8}$/.test(local) ? local : null;
}

/** Select fields every courier card needs, never anything sensitive. */
const COURIER_SELECT = {
  provider: true,
  courierStatus: true,
  trackingCode: true,
  consignmentId: true,
  trackingLink: true,
};

/**
 * Recent orders placed with a mobile number — the phone-lookup list, newest
 * first, capped at 10. Summaries only: no items, no customer name.
 */
export async function findOrdersByPhone(value) {
  const phone = normalizePhone(value);
  if (!phone) return { ok: false, error: 'invalid' };

  const orders = await prisma.order.findMany({
    where: {
      details: { is: { phoneNumber: phone } },
      orderStatus: { not: 'incomplete' },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      orderNo: true,
      orderStatus: true,
      total: true,
      createdAt: true,
      courierBooking: { select: COURIER_SELECT },
    },
  });

  return { ok: true, orders: JSON.parse(JSON.stringify(orders)) };
}

/**
 * The order-number-only lookup: whatever a customer who only has the number
 * from their confirmation SMS needs — status, placed date, total and, when
 * booked, the courier/tracking info. Itemized contents need the phone match
 * (see `trackOrder`).
 */
export async function getOrderSummary(orderNo) {
  const orderNoClean = String(orderNo || '').trim();
  if (!/^\d{1,10}$/.test(orderNoClean)) return { ok: false, error: 'invalid' };

  const order = await prisma.order.findUnique({
    where: { orderNo: orderNoClean },
    select: {
      orderNo: true,
      orderStatus: true,
      createdAt: true,
      total: true,
      courierBooking: { select: COURIER_SELECT },
    },
  });

  if (!order || order.orderStatus === 'incomplete') {
    return { ok: false, error: 'not_found' };
  }

  return { ok: true, order: JSON.parse(JSON.stringify(order)) };
}

/**
 * The full-detail lookup: order number + the mobile number the order was
 * placed with must both match. This is the only path that returns the items
 * and the totals breakdown.
 */
export async function trackOrder(orderNo, mobile) {
  const orderNoClean = String(orderNo || '').trim();
  const phone = normalizePhone(mobile);
  if (!phone || !/^\d{1,10}$/.test(orderNoClean)) {
    return { ok: false, error: 'invalid' };
  }

  const order = await prisma.order.findUnique({
    where: { orderNo: orderNoClean },
    include: { details: true, items: true, courierBooking: true },
  });

  const detailsPhone = normalizePhone(order?.details?.phoneNumber);
  if (!order || order.orderStatus === 'incomplete' || detailsPhone !== phone) {
    return { ok: false, error: 'not_found' };
  }

  const itemsTotal = order.items.reduce(
    (sum, item) => sum + Number(item.purchasePrice) * Number(item.quantity),
    0
  );

  // Only the counts the customer already knows — never the address, the
  // phone, ipAddress/deviceHash, or anything belonging to the user record.
  const booking = order.courierBooking;
  return {
    ok: true,
    order: JSON.parse(
      JSON.stringify({
        orderNo: order.orderNo,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
        total: order.total,
        itemsTotal,
        deliveryCharge: order.details?.deliveryCharge ?? 0,
        discount: order.details?.discount ?? 0,
        shippingArea: order.details?.shippingArea || null,
        customerName: order.details?.customerName || null,
        items: order.items.map((item) => ({
          productTitle: item.productTitle,
          sku: item.sku,
          itemImagePath: item.itemImagePath,
          purchasePrice: item.purchasePrice,
          quantity: item.quantity,
          variantName: item.variantName,
        })),
        courier: booking
          ? {
              provider: booking.provider,
              courierStatus: booking.courierStatus,
              trackingCode: booking.trackingCode,
              consignmentId: booking.consignmentId,
              trackingLink: booking.trackingLink,
              bookedAt: booking.createdAt,
            }
          : null,
      })
    ),
  };
}
