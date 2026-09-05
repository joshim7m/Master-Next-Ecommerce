import { jwtVerify } from 'jose';
import { getJwtSecret } from './jwt-secret';

const COOKIE_NAME = 'admin_session';

export async function verifyToken(token) {
  try {
    const secret = await getJwtSecret();
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload;
  } catch {
    return null;
  }
}

export function getTokenFromCookies(request) {
  return request.cookies.get(COOKIE_NAME)?.value || null;
}

export function isAdminRoute(pathname) {
  return pathname.startsWith('/admin');
}

export function isLoginPage(pathname) {
  return pathname === '/admin/login';
}

export function isAdminApiRoute(pathname) {
  return pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/login');
}

export { COOKIE_NAME };