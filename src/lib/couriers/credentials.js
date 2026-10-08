import prisma from '../prisma';

/**
 * Credential resolution for courier adapters — database only (Settings →
 * Courier Services). There is deliberately **no .env fallback**: courier keys
 * are managed in the admin UI and stored server-side, so an edit there takes
 * effect immediately.
 *
 * Values resolved here never cross into a client — server actions expose only
 * `secrets` (field → 'database'), never the values.
 */

/** Fields that must never be serialized to a client. */
export const SECRET_FIELDS = ['apiKey', 'secretKey', 'clientId', 'clientSecret', 'webhookToken'];

/** Credentials each provider needs before it can be called. */
const REQUIRED_FIELDS = {
  steadfast: ['apiKey', 'secretKey'],
  pathao: ['clientId', 'clientSecret'],
  redx: ['apiKey'],
};

/**
 * Build a provider's effective config from a row (or none). Pure, so callers
 * that already fetched rows in bulk avoid one query per provider.
 *   cfg.enabled         — admin switch (default on when no row exists)
 *   cfg.<secretField>   — resolved value (DB → null)
 *   cfg.secrets         — { field: 'database' } for set fields
 */
export function buildConfig(provider, row = null) {
  const cfg = {
    provider,
    enabled: row ? row.enabled : true,
    hasRow: Boolean(row),
    secrets: {},
    apiKey: null,
    secretKey: null,
    clientId: null,
    clientSecret: null,
    baseUrl: null,
    webhookToken: null,
  };

  for (const field of SECRET_FIELDS) {
    const db = row ? String(row[field] ?? '').trim() : '';
    if (db) {
      cfg[field] = db;
      cfg.secrets[field] = 'database';
    }
  }

  if (row) {
    cfg.baseUrl = String(row.baseUrl ?? '').trim() || null;
  }

  return cfg;
}

/** One row read + buildConfig. Never throws. */
export async function loadCourierConfig(provider) {
  let row = null;
  try {
    row = await prisma.courierService.findUnique({ where: { provider } });
  } catch (e) {
    console.error(`[courier] could not read CourierService "${provider}":`, e.message);
  }
  return buildConfig(provider, row);
}

/** True when every credential the provider requires is resolved. */
export function hasCredentials(cfg) {
  const required = REQUIRED_FIELDS[cfg.provider] || [];
  return required.length > 0 && required.every((f) => Boolean(cfg[f]));
}