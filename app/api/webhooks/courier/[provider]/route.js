import crypto from 'crypto';
import { NextResponse } from 'next/server';
import prisma from '../../../../../src/lib/prisma';
import { loadCourierConfig } from '../../../../../src/lib/couriers/credentials';
import { applyCourierStatus, findBookingByConsignment } from '../../../../../src/lib/courierSync';

/**
 * POST /api/webhooks/courier/{provider}
 *
 * Provider-routed so each courier's signature scheme and payload shape is
 * validated by its own branch (plan §7.5). Currently: Steadfast implemented,
 * Pathao/REDX acknowledged and logged until their adapters exist.
 *
 * Contract we follow (Steadfast docs):
 *   - X-Signature = HMAC-SHA256 of the RAW body, hex, keyed with the auth token
 *   - Authorization: Bearer <token>
 *   - Answer 2xx fast; 5xx retries after 30s/2min; 4xx is never retried.
 *     So anything we merely don't understand is acknowledged with 200 —
 *     only a transient handler failure earns a 500 (worth a retry).
 */
const KNOWN_PROVIDERS = ['steadfast', 'pathao', 'redx'];

function constantTimeEquals(a, b) {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

/** Returns null when authentic, otherwise the reason to reject. */
async function verifySteadfast(request, raw) {
  // Token resolves from Settings → Courier Services (database only), so
  // rotating it in the UI immediately applies to incoming webhooks.
  const { webhookToken: token } = await loadCourierConfig('steadfast');
  if (!token) return 'webhook token is not set — refusing unsigned webhooks (fail closed)';

  const signature = request.headers.get('x-signature') || '';
  const expected = crypto.createHmac('sha256', token).update(raw).digest('hex');
  if (!constantTimeEquals(signature, expected)) return 'bad X-Signature';

  const authorization = request.headers.get('authorization') || '';
  if (!constantTimeEquals(authorization, `Bearer ${token}`)) return 'bad Authorization header';

  return null;
}

export async function POST(request, { params }) {
  const { provider } = await params;

  if (!KNOWN_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Unknown courier.' }, { status: 404 });
  }

  // The signature covers the raw bytes, so read the body before parsing.
  const raw = await request.text();

  if (provider === 'steadfast') {
    const problem = await verifySteadfast(request, raw);
    if (problem) {
      console.warn(`[webhook:steadfast] rejected: ${problem}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    // Reserved for Pathao/REDX: their signature rules arrive with their
    // credentials. Acknowledge (2xx) so nothing upstream blocks on us.
    console.info(`[webhook:${provider}] ${raw.length} bytes received — adapter not implemented, acknowledged.`);
    return NextResponse.json({ received: true, implemented: false });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    console.warn('[webhook:steadfast] body is not JSON — ignoring.');
    return NextResponse.json({ received: false });
  }

  const idempotencyKey = request.headers.get('idempotency-key');

  try {
    switch (event.notification_type) {
      case 'delivery_status': {
        if (!event.consignment_id || !event.status) break;
        const booking = await findBookingByConsignment(provider, event.consignment_id);
        if (!booking) {
          // Not ours (another profile's parcel, or a test) — not an error.
          console.info(`[webhook:steadfast] no booking for consignment ${event.consignment_id}; ignored.`);
          break;
        }
        const result = await applyCourierStatus(booking, String(event.status), { idempotencyKey });
        console.info(
          `[webhook:steadfast] ${event.status} → order ${booking.order?.orderNo}: ` +
            (result.duplicate
              ? 'duplicate, ignored'
              : `orderStatus ${result.orderStatus}${result.changed ? ' (changed)' : ''}`)
        );
        break;
      }

      case 'tracking_update': {
        if (!event.consignment_id) break;
        // Timeline rows are fetched on demand in this iteration (plan §7.5);
        // the webhook only records that something moved.
        await prisma.courierBooking.updateMany({
          where: { provider, consignmentId: String(event.consignment_id) },
          data: { lastSyncedAt: new Date() },
        });
        break;
      }

      default:
        console.info(`[webhook:steadfast] ignored event "${event.notification_type}".`);
    }
  } catch (e) {
    // A transient failure is worth Steadfast's retry — 5xx is retried at +30s/+2min.
    console.error('[webhook:steadfast] handler error:', e);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
