import { CourierError } from './errors';
import { loadCourierConfig } from './credentials';

/**
 * Steadfast Courier adapter — https://portal.packzy.com/api/v1
 * Verified against production 2026-10-07 (see docs/plan-courier-booking.md §2).
 *
 * Auth is two headers on every call (Api-Key / Secret-Key), no token refresh.
 * Credentials/base URL resolve per call via loadCourierConfig (Settings →
 * Courier Services, database only — no .env fallback), so a UI edit applies
 * immediately.
 * Notes that shape the error handling below:
 *   - 10 bad-auth calls in 5 minutes locks the client for 60 minutes, so a 401
 *     must never be retried in a loop.
 *   - Status answers are cached for 60 seconds upstream.
 *   - `invoice` is unique per account, which makes retrying a 500 safe: the
 *     duplicate is refused, so a retry cannot double-book.
 */
const PROVIDER = 'steadfast';
const DEFAULT_BASE_URL = 'https://portal.packzy.com/api/v1';

/** Human message per HTTP status — plan §2.3. */
function messageFor(status) {
  switch (status) {
    case 401:
      return 'Steadfast rejected the credentials — check Settings → Courier Services.';
    case 403:
      return 'Steadfast is not accepting bookings — complete your ownership (KYC) information on the dashboard.';
    case 422:
      return 'Steadfast rejected a field — see the reported errors.';
    case 429:
      return 'Steadfast rate limit hit — wait a minute before trying again.';
    default:
      return `Steadfast request failed (${status}).`;
  }
}

/**
 * `create_order` validation failures arrive as HTTP 200 +
 * `{ status: 400, errors: { recipient_name: ["…"], … } }` — field-keyed
 * (keys match our form fields), values are string arrays. Flatten the first
 * few into one human line so the modal's banner says *what* was wrong.
 */
function summarizeErrors(errors) {
  if (!errors || typeof errors !== 'object') return null;
  const entries = Object.entries(errors);
  if (!entries.length) return null;
  const shown = entries.slice(0, 4).map(([field, msgs]) => {
    const text = Array.isArray(msgs) ? msgs.join(' ') : String(msgs);
    return `${field.replace(/_/g, ' ')}: ${text}`;
  });
  const more = entries.length - shown.length;
  return shown.join(' · ') + (more > 0 ? ` (+${more} more)` : '');
}

async function call(path, { method = 'GET', body, auth = true } = {}) {
  const cfg = await loadCourierConfig(PROVIDER);
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    headers['Api-Key'] = cfg.apiKey || '';
    headers['Secret-Key'] = cfg.secretKey || '';
  }

  let res;
  try {
    res = await fetch(`${cfg.baseUrl || DEFAULT_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch (e) {
    throw new CourierError(PROVIDER, 0, `Could not reach Steadfast: ${e.message}`);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new CourierError(PROVIDER, res.status, messageFor(res.status), {
      code: typeof data.message === 'string' ? data.message : null,
      fields: data.errors && typeof data.errors === 'object' ? data.errors : null,
    });
  }

  // Some endpoints answer HTTP 200 while carrying an error code in the body.
  const bodyStatus = Number(data.status);
  if (Number.isFinite(bodyStatus) && bodyStatus >= 400) {
    throw new CourierError(PROVIDER, bodyStatus, data.message || summarizeErrors(data.errors) || messageFor(bodyStatus), {
      code: data.message || null,
      fields: data.errors && typeof data.errors === 'object' ? data.errors : null,
    });
  }

  return data;
}

async function createOrder(order, payload) {
  const attempt = () => call('/create_order', { method: 'POST', body: payload });

  let data;
  try {
    data = await attempt();
  } catch (e) {
    // One retry for a server-side failure only: invoice uniqueness means the
    // retry either lands or is refused as a duplicate — never double-booked.
    if (e.status !== 500) throw e;
    data = await attempt();
  }

  const c = data.consignment;
  if (!c || !c.consignment_id) {
    throw new CourierError(PROVIDER, 500, 'Steadfast answered without a consignment — nothing was booked.');
  }

  return {
    consignmentId: String(c.consignment_id),
    trackingCode: c.tracking_code || null,
    trackingLink: c.tracking_link || null,
    status: c.status || 'in_review',
  };
}

async function statusByConsignment(consignmentId) {
  const data = await call(`/status_with_return_status_by_cid/${encodeURIComponent(consignmentId)}`);
  if (typeof data.delivery_status !== 'string' || !data.delivery_status) {
    throw new CourierError(PROVIDER, 404, 'Steadfast does not know this consignment.');
  }
  return { status: data.delivery_status };
}

async function trackings(invoice) {
  const data = await call(`/trackings_by_invoice/${encodeURIComponent(invoice)}`);
  const rows = Array.isArray(data.tracking) ? data.tracking : [];
  return rows.map((r) => ({
    text: r.text || '',
    createdAt: r.created_at || null,
    type: r.tracking_type ?? null,
  }));
}

/** Cheap credential probe: get_balance answers 401 when the keys are wrong. */
async function healthCheck() {
  const data = await call('/get_balance');
  return { balance: Number(data.current_balance ?? 0) };
}

export default { createOrder, statusByConsignment, trackings, healthCheck, implemented: true };
