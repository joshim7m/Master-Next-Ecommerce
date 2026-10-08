import { CourierError, CourierNotConfigured } from './errors';
import { buildConfig, loadCourierConfig, hasCredentials } from './credentials';
import { COURIERS, getCourierMeta } from './registry';
import steadfast from './steadfast';
import pathao from './pathao';
import redx from './redx';

/**
 * The courier registry — the single source of truth behind the modal's
 * "Select Courier" dropdown. Availability is derived from a CourierService row
 * (Settings → Courier Services), so credentials and the on/off switch are
 * managed in the admin UI, never in code or .env.
 *
 * Every adapter implements:
 *   createOrder(order, payload)        → { consignmentId, trackingCode, trackingLink, status }
 *   statusByConsignment(consignmentId) → { status }
 *   trackings(invoice)                 → [{ text, createdAt, type }]
 *   healthCheck()                      → cheap credential probe
 * and sets `implemented` — stubs keep it false so a configured-but-unbuilt
 * provider stays disabled in the dropdown ("integration pending") instead of
 * failing at booking time.
 */
export { COURIERS, getCourierMeta } from './registry';

const ADAPTERS = { steadfast, pathao, redx };

/** True when the provider has real booking code behind it (not a stub). */
export function hasAdapter(id) {
  return Boolean(ADAPTERS[id]) && ADAPTERS[id].implemented !== false;
}

/** True when the provider's credentials resolve (DB row). Async: DB read. */
export async function isConfigured(id) {
  if (!getCourierMeta(id)) return false;
  return hasCredentials(await loadCourierConfig(id));
}

/**
 * The adapter for a provider. Throws `CourierNotConfigured` for a provider
 * that is disabled or lacks credentials, `CourierError` for a typo'd id or an
 * unimplemented adapter, so a caller can tell those cases apart.
 */
export async function getCourier(id) {
  const meta = getCourierMeta(id);
  if (!meta) {
    throw new CourierError(id, 400, `Unknown courier "${id}".`);
  }
  if (!hasAdapter(id)) {
    throw new CourierError(id, 501, `The ${meta.label} adapter is not implemented yet.`);
  }
  const cfg = await loadCourierConfig(id);
  if (!cfg.enabled) {
    const err = new CourierNotConfigured(id);
    err.disabled = true;
    throw err;
  }
  if (!hasCredentials(cfg)) {
    throw new CourierNotConfigured(id);
  }
  return ADAPTERS[id];
}

export { buildConfig, loadCourierConfig, hasCredentials };
