'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../lib/prisma';
import { COURIERS, getCourier, getCourierMeta, hasAdapter, buildConfig, hasCredentials, loadCourierConfig } from '../lib/couriers';
import { applyCourierStatus } from '../lib/courierSync';

function serialize(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/*
 * Truncation limits Steadfast applies silently before storing (plan §2.2).
 * Cutting here keeps what we store equal to what they store, instead of
 * discovering the difference on the way back.
 */
const LIMITS = {
  invoice: 100,
  recipient_name: 100,
  recipient_phone: 40,
  recipient_address: 490,
  note: 480,
  item_description: 255,
  alternative_phone: 40,
};

function trim(value, max) {
  return String(value ?? '').slice(0, max);
}

/**
 * Couriers for the modal's Select Courier dropdown. Labels only — never
 * credential values. Built-in providers come first (enabled = service on +
 * adapter built + credentials resolved from the CourierService row), then
 * custom services from Settings, always disabled with a `reason` explaining
 * why. The modal renders that reason next to the option.
 */
export async function getAvailableCouriers() {
  const services = await prisma.courierService.findMany();
  const byProvider = new Map(services.map((s) => [s.provider, s]));

  const registry = COURIERS.map((c) => {
    const row = byProvider.get(c.id) || null;
    const cfg = buildConfig(c.id, row);
    const implemented = hasAdapter(c.id);
    const configured = hasCredentials(cfg);
    const enabled = cfg.enabled && implemented && configured;
    const reason = !cfg.enabled
      ? 'disabled in settings'
      : !configured
        ? 'credentials pending'
        : !implemented
          ? 'integration pending'
          : null;
    return { id: c.id, label: row?.name || c.label, enabled, reason: enabled ? null : reason };
  });

  const custom = services
    .filter((s) => !COURIERS.some((c) => c.id === s.provider))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((s) => ({
      id: s.provider,
      label: s.name,
      enabled: false, // no adapter can exist for a row created in the UI
      reason: s.enabled ? 'integration pending' : 'disabled in settings',
    }));

  return [...registry, ...custom];
}

/** Booking + tracking timeline for one order, or null when not booked. */
export async function getCourierBooking(orderNo) {
  const order = await prisma.order.findUnique({
    where: { orderNo: String(orderNo) },
    select: { id: true, orderNo: true, orderStatus: true },
  });
  if (!order) return null;

  const booking = await prisma.courierBooking.findUnique({ where: { orderId: order.id } });
  if (!booking) return null;

  let timeline = [];
  let timelineError = null;
  try {
    const adapter = await getCourier(booking.provider);
    timeline = await adapter.trackings(order.orderNo);
  } catch (e) {
    // The timeline is decoration — a missing key or rate limit must not stop
    // the panel from rendering the booking itself.
    timelineError = e.message || 'Timeline unavailable.';
  }

  return serialize({ booking, timeline, timelineError, orderStatus: order.orderStatus });
}

/**
 * Book one parcel with the chosen courier. Returns a discriminated result —
 * never throws for expected failures — so the modal can render inline errors:
 *   { ok: true, booking } | { ok: false, error, fieldErrors?, alreadyBooked? }
 */
export async function bookCourier(orderNo, provider, payload = {}) {
  const invoice = String(orderNo || '').trim();
  const meta = getCourierMeta(provider);
  if (!meta) return { ok: false, error: 'Unknown courier.' };

  const order = await prisma.order.findUnique({
    where: { orderNo: invoice },
    include: { details: true },
  });
  if (!order) return { ok: false, error: 'Order not found.' };
  if (order.orderStatus === 'incomplete') {
    return { ok: false, error: 'Incomplete (draft) orders cannot be booked.' };
  }
  if (order.orderStatus === 'cancelled') {
    return { ok: false, error: 'Cancelled orders cannot be booked.' };
  }

  // orderId @unique means one booking per order; the check is here for a
  // readable message instead of a raw P2002.
  const existing = await prisma.courierBooking.findUnique({ where: { orderId: order.id } });
  if (existing) {
    return { ok: false, error: 'This order is already booked with a courier.', alreadyBooked: true };
  }

  const cfg = await loadCourierConfig(provider);
  if (!cfg.enabled) {
    return { ok: false, error: `${meta.label} is disabled — enable it in Settings → Courier Services.` };
  }
  if (!hasAdapter(provider)) {
    return { ok: false, error: `The ${meta.label} integration is not ready yet — book this parcel manually.` };
  }
  if (!hasCredentials(cfg)) {
    return { ok: false, error: `${meta.label} credentials are not configured.` };
  }

  // ── Field validation (mirrors what the courier enforces server-side) ──
  const fieldErrors = {};
  const recipient_name = trim(payload.recipient_name, LIMITS.recipient_name);
  const recipient_phone = trim(payload.recipient_phone, LIMITS.recipient_phone);
  const recipient_address = trim(payload.recipient_address, LIMITS.recipient_address);
  const cod_amount = Number(payload.cod_amount);

  if (!recipient_name) fieldErrors.recipient_name = 'Recipient name is required.';
  if (!recipient_phone) fieldErrors.recipient_phone = 'Recipient phone is required.';
  else if (!/^01\d{9}$/.test(recipient_phone)) {
    fieldErrors.recipient_phone = 'Enter an 11-digit Bangladeshi number starting 01.';
  }
  if (!recipient_address) fieldErrors.recipient_address = 'Recipient address is required.';
  if (!Number.isFinite(cod_amount) || cod_amount < 0) {
    fieldErrors.cod_amount = 'Enter a valid amount (0 for prepaid).';
  } else if (cod_amount > 1_000_000) {
    fieldErrors.cod_amount = 'Maximum 1,000,000 BDT.';
  }
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  const body = {
    invoice,
    recipient_name,
    recipient_phone,
    recipient_address,
    cod_amount,
    ...(trim(payload.note, LIMITS.note) ? { note: trim(payload.note, LIMITS.note) } : {}),
    ...(trim(payload.alternative_phone, LIMITS.alternative_phone)
      ? { alternative_phone: trim(payload.alternative_phone, LIMITS.alternative_phone) }
      : {}),
    ...(trim(payload.item_description, LIMITS.item_description)
      ? { item_description: trim(payload.item_description, LIMITS.item_description) }
      : {}),
    ...(Number(payload.total_lot) > 0 ? { total_lot: Number(payload.total_lot) } : {}),
    ...(payload.delivery_type === 1 || payload.delivery_type === '1' ? { delivery_type: 1 } : {}),
  };

  let result;
  try {
    const adapter = await getCourier(provider);
    result = await adapter.createOrder(order, body);
  } catch (e) {
    // CourierError / CourierNotConfigured both carry a human message; anything
    // else is a bug and should surface in the server log.
    if (e.name !== 'CourierError' && e.name !== 'CourierNotConfigured') {
      console.error(`[courier] book failed for ${invoice}:`, e);
      return { ok: false, error: 'Unexpected booking failure — see server logs.' };
    }
    // Steadfast's `errors` is field-keyed (recipient_name, cod_amount, …) with
    // string-array values — normalize to plain strings the modal can render
    // inline next to the matching input.
    const fieldErrors = e.fields
      ? Object.fromEntries(
          Object.entries(e.fields).map(([key, value]) => [key, Array.isArray(value) ? value.join(' ') : String(value)])
        )
      : undefined;
    return { ok: false, error: e.message, status: e.status ?? null, fieldErrors };
  }

  let booking;
  try {
    booking = await prisma.courierBooking.create({
      data: {
        orderId: order.id,
        provider,
        consignmentId: result.consignmentId,
        trackingCode: result.trackingCode,
        trackingLink: result.trackingLink,
        courierStatus: result.status || 'in_review',
      },
    });
  } catch (e) {
    if (e.code === 'P2002') {
      // Lost a race against a second submit / another admin.
      return { ok: false, error: 'This order was just booked.', alreadyBooked: true };
    }
    throw e;
  }

  revalidatePath(`/admin/orders/${invoice}`);
  return { ok: true, booking: serialize(booking) };
}

/**
 * Ask the courier where the parcel is (respecting their 60s status cache) and
 * apply the mapped result. Returns { ok, courierStatus, orderStatus, changed, flag }.
 */
export async function syncCourierStatus(orderNo) {
  const order = await prisma.order.findUnique({
    where: { orderNo: String(orderNo) },
    select: { id: true, orderNo: true },
  });
  if (!order) return { ok: false, error: 'Order not found.' };

  const booking = await prisma.courierBooking.findUnique({
    where: { orderId: order.id },
    include: { order: true },
  });
  if (!booking) return { ok: false, error: 'Not booked with a courier yet.' };

  let status;
  try {
    const adapter = await getCourier(booking.provider);
    ({ status } = await adapter.statusByConsignment(booking.consignmentId));
  } catch (e) {
    if (e.name !== 'CourierError' && e.name !== 'CourierNotConfigured') {
      console.error(`[courier] sync failed for ${order.orderNo}:`, e);
      return { ok: false, error: 'Unexpected sync failure — see server logs.' };
    }
    return { ok: false, error: e.message, status: e.status ?? null };
  }

  const result = await applyCourierStatus(booking, status);
  revalidatePath(`/admin/orders/${order.orderNo}`);

  return { ok: true, ...serialize(result) };
}
