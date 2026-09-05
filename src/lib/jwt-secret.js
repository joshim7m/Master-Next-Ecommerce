import prisma from './prisma';

export const DEV_JWT_SECRET = 'dev-secret-change-in-production';

export async function getJwtSecret() {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv) return fromEnv;

  try {
    const settings = await prisma.siteSetting.findUnique({ where: { id: 'singleton' } });
    if (settings?.jwtSecret) return settings.jwtSecret;
  } catch (error) {
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      console.error('[jwt] Unable to read JWT secret from database:', error.message);
    }
  }

  if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
    throw new Error('JWT_SECRET environment variable must be set in production');
  }

  return DEV_JWT_SECRET;
}