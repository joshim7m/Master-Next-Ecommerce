import { cache } from 'react';
import prisma from './prisma';

export const getSiteSettings = cache(async () => {
  try {
    const settings = await prisma.siteSetting.findUnique({ where: { id: 'singleton' } });
    return settings || {};
  } catch {
    return {};
  }
});