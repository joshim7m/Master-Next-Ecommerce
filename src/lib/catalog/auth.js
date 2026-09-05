import { verifyToken, getTokenFromCookies } from '@/src/lib/auth-edge';

export async function requireAdmin(request) {
  const token = getTokenFromCookies(request);
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.role === 'admin' ? payload : null;
}
