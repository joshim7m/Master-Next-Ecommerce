import prisma from './prisma';
import { mapCourierToOrderStatus } from './courierStatus';

/**
 * Shared status-application logic — the one place courier statuses are written
 * to the database. Used by the manual Sync action and the webhook route so the
 * guards in courierStatus.js apply identically to both paths.
 */

/** Lookup by the webhook's natural key: (provider, consignmentId). */
export async function findBookingByConsignment(provider, consignmentId) {
  return prisma.courierBooking.findUnique({
    where: { provider_consignmentId: { provider, consignmentId: String(consignmentId) } },
    include: { order: true },
  });
}

/**
 * Write `status` onto the booking and — per the mapping guards — onto
 * `Order.orderStatus`.
 *
 * `idempotencyKey` (from the webhook's Idempotency-Key header) is remembered on
 * the booking: a replayed retry with the same key is ignored, so Steadfast's
 * at-least-once delivery cannot re-apply an event.
 */
export async function applyCourierStatus(booking, status, { idempotencyKey = null } = {}) {
  if (!booking || !status) return { applied: false, duplicate: false };

  // Idempotency is checked against the DB, not the (possibly stale) object the
  // caller holds — a replayed webhook event must be caught even when the
  // booking row was written after `booking` was fetched.
  if (idempotencyKey) {
    const stored = await prisma.courierBooking.findUnique({
      where: { id: booking.id },
      select: { lastEventKey: true },
    });
    if (stored?.lastEventKey === idempotencyKey) {
      return { applied: false, duplicate: true };
    }
  }

  const previousOrderStatus = booking.order?.orderStatus || null;
  const mapping = mapCourierToOrderStatus(booking.provider, status, previousOrderStatus);

  const updated = await prisma.courierBooking.update({
    where: { id: booking.id },
    data: {
      courierStatus: status,
      lastSyncedAt: new Date(),
      ...(idempotencyKey ? { lastEventKey: idempotencyKey } : {}),
    },
  });

  let orderStatus = previousOrderStatus;
  let changed = false;
  if (mapping.orderStatus && mapping.orderStatus !== previousOrderStatus) {
    await prisma.order.update({
      where: { id: booking.orderId },
      data: { orderStatus: mapping.orderStatus },
    });
    orderStatus = mapping.orderStatus;
    changed = true;
  }

  return {
    applied: true,
    duplicate: false,
    courierStatus: status,
    orderStatus,
    changed,
    flag: mapping.flag,
    lastSyncedAt: updated.lastSyncedAt,
  };
}
