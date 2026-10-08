import { CourierError } from './errors';

/**
 * Pathao Courier adapter — STUB.
 *
 * Shown in the Select Courier dropdown as disabled ("integration pending")
 * until this adapter is built — credentials alone (settings → Courier
 * Services, database only) do not enable it. When Pathao lands: implement the
 * four methods below against their API, flip `implemented` to true, add their
 * status row to src/lib/courierStatus.js, and their signature check to
 * app/api/webhooks/courier/[provider]/route.js — nothing else changes.
 */
const PROVIDER = 'pathao';

function notImplemented() {
  throw new CourierError(PROVIDER, 501, 'The Pathao adapter is not implemented yet.');
}

export default {
  createOrder: notImplemented,
  statusByConsignment: notImplemented,
  trackings: notImplemented,
  healthCheck: notImplemented,
  implemented: false,
};
