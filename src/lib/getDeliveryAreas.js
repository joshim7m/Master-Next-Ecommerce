import { cache } from 'react';
import prisma from './prisma';
import { parseDeliveryAreas } from './deliveryAreas';

/**
 * The admin-configured delivery zones (Settings → Site Config), parsed and
 * cached per request. Falls back to the storefront defaults when the column is
 * empty or unreadable, so checkout always has at least one zone to price.
 */
export const getDeliveryAreas = cache(async () => {
  try {
    const settings = await prisma.siteSetting.findUnique({
      where: { id: 'singleton' },
      select: { deliveryAreas: true },
    });
    return parseDeliveryAreas(settings?.deliveryAreas);
  } catch {
    return parseDeliveryAreas(null);
  }
});
