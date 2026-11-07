/**
 * Order statuses that block a device from starting a new checkout or saving a
 * new incomplete draft. Shared by `/api/checkout` and `/api/checkout/incomplete`.
 *
 * `incomplete` must NOT be in this list — drafts are what gets created here;
 * they are handled separately (one dangling draft per device, reused not duplicated).
 * The `blocked` status pairs with the hard blocklist in `prisma.blockedDevice`.
 */
export const LIVE_ORDER_STATUSES = ['pending', 'blocked', 'hold', 'in_review'];
