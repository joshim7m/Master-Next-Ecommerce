import { cache } from 'react';
import prisma from './prisma';
import { parseFreeDeliverySettings } from './freeDelivery';

/**
 * The admin-configured free-delivery promo (Settings → Site Config), parsed and
 * cached per request. Falls back to disabled when the singleton row is missing
 * or unreadable. Mirrors `getDeliveryAreas.js`.
 */
export const getFreeDeliverySettings = cache(async () => {
  try {
    const settings = await prisma.siteSetting.findUnique({
      where: { id: 'singleton' },
      select: { freeDeliveryEnabled: true, freeDeliveryMinProducts: true },
    });
    return parseFreeDeliverySettings(settings);
  } catch {
    return parseFreeDeliverySettings(null);
  }
});
