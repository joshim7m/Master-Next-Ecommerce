'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../lib/prisma';
import { COURIERS, getCourierMeta, hasAdapter, buildConfig, hasCredentials } from '../lib/couriers';
import { SECRET_FIELDS } from '../lib/couriers/credentials';

function serialize(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Settings → Courier Services (list + form data). Secrets never leave the
 * server: callers get `secrets` (field → 'database') instead of values, so
 * the UI can say *what* is saved without ever seeing it. Unread fields stay
 * blank on edit = keep current value; a field named in `clearSecrets` is
 * nulled explicitly. Credentials are database-only — there is no .env
 * fallback, so an unset field really is unset.
 */

const PROVIDER_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const URL_FIELDS = ['baseUrl', 'trackingUrl'];

function validate(input, { requireProvider = true } = {}) {
  const errors = {};
  const name = String(input.name ?? '').trim();
  const provider = String(input.provider ?? '').trim().toLowerCase();

  if (!name) errors.name = 'Name is required.';
  else if (name.length > 60) errors.name = 'Maximum 60 characters.';

  if (requireProvider) {
    if (!provider) errors.provider = 'Provider code is required.';
    else if (provider.length > 40 || !PROVIDER_RE.test(provider)) {
      errors.provider = 'Lowercase letters, digits and hyphens only (e.g. sa-paribahan).';
    }
  }

  const values = { name };
  if (requireProvider) values.provider = provider;

  for (const field of URL_FIELDS) {
    const v = String(input[field] ?? '').trim();
    if (v && !/^https?:\/\/\S+$/.test(v)) errors[field] = 'Must start with http:// or https://.';
    values[field] = v || null;
  }

  const sortOrder = Number(input.sortOrder ?? 0);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) {
    errors.sortOrder = 'Sort order must be 0–9999.';
  }
  values.sortOrder = Number.isInteger(sortOrder) ? sortOrder : 0;
  values.enabled = input.enabled !== false;

  for (const field of SECRET_FIELDS) {
    const v = String(input[field] ?? '').trim();
    if (v.length > 500) errors[field] = 'Maximum 500 characters.';
  }

  return { errors, values };
}

/** Secret inputs: non-empty → new value; listed in `clear` → null; else keep. */
function applySecrets(input, { clear = [], keepExisting = false } = {}) {
  const data = {};
  for (const field of SECRET_FIELDS) {
    const v = String(input[field] ?? '').trim();
    if (v) data[field] = v;
    else if (clear.includes(field) || !keepExisting) data[field] = null;
  }
  return data;
}

/** Masked, UI-ready description of one provider (row may be null). */
function describe(provider, row, cfg) {
  const meta = getCourierMeta(provider);
  const implemented = hasAdapter(provider);
  const configured = hasCredentials(cfg);
  const status = !cfg.enabled
    ? 'disabled'
    : implemented
      ? configured
        ? 'ready'
        : 'credentials-pending'
      : 'adapter-pending';

  return {
    id: row?.id ?? null,
    provider,
    name: row?.name || meta?.label || provider,
    hasAdapter: implemented,
    adapterLabel: meta?.label || null,
    hasRow: Boolean(row),
    enabled: cfg.enabled,
    configured,
    status,
    secrets: cfg.secrets,
    baseUrl: row?.baseUrl ?? null,
    trackingUrl: row?.trackingUrl ?? null,
    sortOrder: row?.sortOrder ?? 0,
    createdAt: row?.createdAt ?? null,
    updatedAt: row?.updatedAt ?? null,
  };
}

/** Every service: built-in providers first (code order), then custom rows. */
export async function getCourierServices() {
  const rows = await prisma.courierService.findMany();
  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  const registry = COURIERS.map((c) => {
    const row = byProvider.get(c.id) || null;
    return describe(c.id, row, buildConfig(c.id, row));
  });

  const custom = rows
    .filter((r) => !COURIERS.some((c) => c.id === r.provider))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((r) => describe(r.provider, r, buildConfig(r.provider, r)));

  return serialize([...registry, ...custom]);
}

/**
 * One service by provider code — built-ins resolve even without a row.
 * Used only by the edit page, so it additionally returns `secretValues` (the
 * actual stored keys) so the form can display them masked and edit in place.
 * The list action `getCourierServices()` never includes values.
 */
export async function getCourierService(provider) {
  const p = String(provider || '').trim().toLowerCase();
  let row = null;
  try {
    row = await prisma.courierService.findUnique({ where: { provider: p } });
  } catch {}
  if (!row && !getCourierMeta(p)) return null;

  const secretValues = {};
  for (const field of SECRET_FIELDS) {
    const v = row ? String(row[field] ?? '').trim() : '';
    if (v) secretValues[field] = v;
  }

  return serialize({ ...describe(p, row, buildConfig(p, row)), secretValues });
}

/** Result helper — validation problems come back inline, never thrown. */
function invalid(errors) {
  return { ok: false, errors };
}

export async function createCourierService(data) {
  try {
    const { errors, values } = validate(data);
    if (Object.keys(errors).length) return invalid(errors);

    const existing = await prisma.courierService.findUnique({ where: { provider: values.provider } });
    if (existing) return invalid({ provider: 'This provider code already exists.' });

    await prisma.courierService.create({
      data: { ...values, ...applySecrets(data) },
    });
  } catch (e) {
    if (e.code === 'P2002') return invalid({ provider: 'This provider code already exists.' });
    console.error('[courierService] create failed:', e);
    return { ok: false, error: 'Could not save the service — an unexpected error occurred. See the server logs.' };
  }

  revalidatePath('/admin/settings/couriers');
  return { ok: true };
}

/**
 * Save one service. Upserts for built-in providers, so editing an env-only
 * courier (no row yet) creates its override row on first save. The provider
 * code itself is immutable — bookings reference it.
 */
export async function updateCourierService(provider, data) {
  const p = String(provider || '').trim().toLowerCase();
  try {
    const existing = await prisma.courierService.findUnique({ where: { provider: p } });
    if (!existing && !getCourierMeta(p)) return { ok: false, error: 'Courier service not found.' };

    const { errors, values } = validate(data, { requireProvider: false });
    if (Object.keys(errors).length) return invalid(errors);

    const rowData = { ...values, ...applySecrets(data, { clear: data.clearSecrets || [], keepExisting: true }) };

    if (existing) {
      await prisma.courierService.update({ where: { provider: p }, data: rowData });
    } else {
      await prisma.courierService.create({ data: { provider: p, ...rowData } });
    }
  } catch (e) {
    if (e.code === 'P2002') return invalid({ provider: 'This provider code already exists.' });
    console.error(`[courierService] update failed for "${p}":`, e);
    return { ok: false, error: 'Could not save the service — an unexpected error occurred. See the server logs.' };
  }

  revalidatePath('/admin/settings/couriers');
  return { ok: true };
}

/** Enable/disable. Upserts so a built-in provider can be disabled with no row. */
export async function setCourierServiceEnabled(provider, enabled) {
  const p = String(provider || '').trim().toLowerCase();
  const meta = getCourierMeta(p);
  const row = await prisma.courierService.findUnique({ where: { provider: p } });
  if (!row && !meta) return { ok: false, error: 'Courier service not found.' };

  const on = Boolean(enabled);
  if (row) {
    await prisma.courierService.update({ where: { provider: p }, data: { enabled: on } });
  } else {
    await prisma.courierService.create({ data: { provider: p, name: meta.label, enabled: on } });
  }

  revalidatePath('/admin/settings/couriers');
  return { ok: true };
}

/**
 * Delete the row. Built-in providers become unconfigured (no stored
 * credentials) and show "credentials pending"; custom services disappear from
 * the list and dropdown.
 */
export async function deleteCourierService(provider) {
  const p = String(provider || '').trim().toLowerCase();
  const row = await prisma.courierService.findUnique({ where: { provider: p } });
  if (!row) return { ok: false, error: 'Courier service not found.' };

  try {
    await prisma.courierService.delete({ where: { provider: p } });
  } catch (e) {
    console.error(`[courierService] delete failed for "${p}":`, e);
    return { ok: false, error: 'Could not delete the service — an unexpected error occurred. See the server logs.' };
  }
  revalidatePath('/admin/settings/couriers');
  return { ok: true };
}
