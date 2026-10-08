/**
 * Two-way map: courier status → store `Order.orderStatus`, per provider.
 *
 * Store statuses: pending · processing · completed · cancelled · return · incomplete
 *
 * Each entry: `{ to }` = the order status to move to, optionally `flag` = a UI
 * flag when nothing changes but the admin should see why ('hold' or
 * 'unrecognized'). `to: null` means "badge only — leave orderStatus alone".
 *
 * Guards (identical for every provider, plan §6):
 *   1. `incomplete` drafts are never touched (and can never be booked).
 *   2. Into an admin-set terminal state (completed/cancelled/return) only a
 *      confirmed arrival (completed/return) may move it — a stray "pending"
 *      event can never resurrect a cancelled order.
 *   3. `processing` is admin-owned: couriers may complete/cancel/return it,
 *      never demote it back to pending.
 *   4. Unknown provider or status → no change + 'unrecognized' flag, so a new
 *      courier can never corrupt orderStatus by surprise.
 *
 * Approval-pending tiers exist because the rider's word is not confirmed yet —
 * the docs are explicit that books must not be settled on them.
 */
const STEADFAST_MAP = {
  in_review: { to: 'pending' },
  pending: { to: 'pending' },
  hold: { to: null, flag: 'hold' },

  delivered_approval_pending: { to: null },
  partial_delivered_approval_pending: { to: null },
  cancelled_approval_pending: { to: null },
  unknown_approval_pending: { to: null },

  delivered: { to: 'completed' },
  partial_delivered: { to: 'completed' },
  cancelled: { to: 'cancelled' },

  partial_delivered_return_received: { to: 'return' },
  cancelled_return_received: { to: 'return' },
  partial_delivered_return_proccessing: { to: null },
  partial_delivered_return_rider_assigned: { to: null },
  cancelled_return_proccessing: { to: null },
  cancelled_return_rider_assigned: { to: null },

  exceptional: { to: null, flag: 'unrecognized' },
  unknown: { to: null, flag: 'unrecognized' },
};

// Pathao / REDX: filled in when credentials arrive — the vocabulary gets
// confirmed against their docs (plan §6.2). Until then every status of theirs
// falls through to "no change + unrecognized", which is the safe default.
const PATHAO_MAP = {};
const REDX_MAP = {};

const MAPS = { steadfast: STEADFAST_MAP, pathao: PATHAO_MAP, redx: REDX_MAP };

const TERMINAL = ['completed', 'cancelled', 'return'];

/**
 * @returns {{ orderStatus: string|null, flag: string|null }} `orderStatus` is
 * null when nothing should change; `flag` explains why when it does.
 */
export function mapCourierToOrderStatus(provider, courierStatus, currentOrderStatus) {
  if (!currentOrderStatus || currentOrderStatus === 'incomplete') {
    return { orderStatus: null, flag: null };
  }

  const map = MAPS[provider];
  const entry = map && Object.prototype.hasOwnProperty.call(map, courierStatus) ? map[courierStatus] : null;
  if (!entry) return { orderStatus: null, flag: 'unrecognized' };

  const { to = null, flag = null } = entry;
  if (!to || to === currentOrderStatus) return { orderStatus: null, flag };

  // Guard 2 — into an admin-set terminal state, only a confirmed arrival may
  // move it (delivered → completed, return-received → return). A courier
  // "cancelled" cannot overwrite an admin's completed, nor vice versa.
  if (TERMINAL.includes(currentOrderStatus) && to !== 'completed' && to !== 'return') {
    return { orderStatus: null, flag };
  }

  // Guard 3 — `processing` is admin-owned; only terminal mappings apply.
  if (currentOrderStatus === 'processing' && !TERMINAL.includes(to)) {
    return { orderStatus: null, flag };
  }

  return { orderStatus: to, flag };
}

/** Friendly label for the badge; falls back to a prettified raw status. */
const STEADFAST_LABELS = {
  in_review: 'In review',
  pending: 'Pending',
  hold: 'On hold',
  delivered_approval_pending: 'Delivered (awaiting confirmation)',
  partial_delivered_approval_pending: 'Part delivered (awaiting confirmation)',
  cancelled_approval_pending: 'Cancelled (awaiting confirmation)',
  unknown_approval_pending: 'Awaiting confirmation',
  delivered: 'Delivered',
  partial_delivered: 'Partially delivered',
  cancelled: 'Cancelled',
  exceptional: 'Exception — contact support',
  unknown: 'Unrecognized status',
  partial_delivered_return_proccessing: 'Return preparing (part delivered)',
  partial_delivered_return_rider_assigned: 'Return out for pickup (part delivered)',
  partial_delivered_return_received: 'Returned to you (part delivered)',
  cancelled_return_proccessing: 'Return preparing',
  cancelled_return_rider_assigned: 'Return out for pickup',
  cancelled_return_received: 'Returned to you',
};

const LABELS = { steadfast: STEADFAST_LABELS };

export function courierStatusLabel(provider, status) {
  const table = LABELS[provider] || {};
  if (table[status]) return table[status];
  return String(status || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Badge colours keyed by coarse group — keeps the modal and card in sync. */
export function courierStatusTone(status = '') {
  if (status.includes('approval_pending')) return 'blue';
  if (status.startsWith('delivered') || status === 'partial_delivered') return 'emerald';
  if (status.includes('return_received')) return 'purple';
  if (status.includes('return')) return 'indigo';
  if (status === 'cancelled') return 'red';
  if (status === 'hold') return 'amber';
  if (status === 'exceptional' || status === 'unknown') return 'slate';
  return 'amber';
}
