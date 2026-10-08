/**
 * Courier registry — pure data, no server imports, so client components
 * (settings forms, the booking modal) can use it without pulling Prisma or
 * the adapters into the browser bundle. Behavior built on top of this data
 * (credential resolution, availability) lives in ./index.js, server-side only.
 */
export const COURIERS = [
  { id: 'steadfast', label: 'Steadfast Courier' },
  { id: 'pathao', label: 'Pathao Courier' },
  { id: 'redx', label: 'REDX Delivery' },
];

/** Registry entry for a provider id, or null when unknown. */
export function getCourierMeta(id) {
  return COURIERS.find((c) => c.id === id) || null;
}
