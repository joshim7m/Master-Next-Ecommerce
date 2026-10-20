/**
 * Delivery zones (area name + charge) configured by the admin on
 * /admin/settings/site-config. Stored on SiteSetting.deliveryAreas as a JSON
 * string; every consumer goes through `parseDeliveryAreas` so a missing or
 * corrupt value falls back to the storefront defaults instead of crashing.
 */

export const DEFAULT_DELIVERY_AREAS = [
  { name: 'Inside Dhaka', charge: 80 },
  { name: 'Outside Dhaka', charge: 120 },
];

/**
 * Normalizes anything stored/sent into `[{ name, charge }]`.
 * Invalid entries are dropped, duplicates (case-insensitive) keep the first,
 * an empty result falls back to the defaults so a zone is always selectable.
 */
export function parseDeliveryAreas(raw) {
  let list = raw;

  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      list = null;
    }
  }
  if (!Array.isArray(list)) return [...DEFAULT_DELIVERY_AREAS];

  const seen = new Set();
  const areas = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const charge = Number(item.charge);
    if (!name || !Number.isFinite(charge) || charge < 0) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    areas.push({ name, charge });
  }

  return areas.length ? areas : [...DEFAULT_DELIVERY_AREAS];
}

/**
 * Canonical zone name for a requested area. Names are matched
 * case-insensitively; an unknown/blank value falls back to the first
 * configured zone so an order can always be saved.
 */
export function resolveAreaName(areas, name) {
  const list = Array.isArray(areas) && areas.length ? areas : DEFAULT_DELIVERY_AREAS;
  const wanted = String(name ?? '').trim().toLowerCase();
  const hit = list.find((area) => area.name.toLowerCase() === wanted);
  return hit ? hit.name : list[0].name;
}

/**
 * Charge for a zone, matched case-insensitively against `areas` (then against
 * the defaults for legacy names like a renamed "Inside Dhaka"). This is the
 * server-side source of truth — never trust a charge sent by the browser.
 */
export function chargeForArea(areas, name) {
  const list = Array.isArray(areas) && areas.length ? areas : DEFAULT_DELIVERY_AREAS;
  const wanted = String(name ?? '').trim().toLowerCase();
  const hit =
    list.find((area) => area.name.toLowerCase() === wanted) ||
    DEFAULT_DELIVERY_AREAS.find((area) => area.name.toLowerCase() === wanted);
  return (hit || list[0]).charge;
}
