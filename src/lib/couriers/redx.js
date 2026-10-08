import { CourierError } from './errors';

/**
 * REDX Delivery adapter — STUB.
 *
 * Shown in the Select Courier dropdown as disabled ("integration pending")
 * until this adapter is built — credentials alone (settings → Courier
 * Services, database only) do not enable it. When REDX lands: implement the
 * four methods below against their API, flip `implemented` to true, add their
 * status row to src/lib/courierStatus.js, and their signature check to
 * app/api/webhooks/courier/[provider]/route.js — nothing else changes.
 */
const PROVIDER = 'redx';

function notImplemented() {
  throw new CourierError(PROVIDER, 501, 'The REDX adapter is not implemented yet.');
}

export default {
  createOrder: notImplemented,
  statusByConsignment: notImplemented,
  trackings: notImplemented,
  healthCheck: notImplemented,
  implemented: false,
};
