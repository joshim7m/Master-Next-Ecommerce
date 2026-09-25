import { NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookies, isAdminRoute, isLoginPage, isAdminApiRoute, COOKIE_NAME } from './src/lib/auth-edge';
import prisma from './src/lib/prisma';

const MANAGE_ROLES = ['super-admin', 'admin', 'manager'];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (!isAdminRoute(pathname) && !isAdminApiRoute(pathname)) {
    return NextResponse.next();
  }

  if (isLoginPage(pathname)) {
    return NextResponse.next();
  }

  const token = getTokenFromCookies(request);
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Live account check: role must be a manager-role and status must be active,
  // so disabling a user kills their session on their next request (force logout).
  const dbUser = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { role: true, status: true },
  });

  if (!dbUser || !MANAGE_ROLES.includes(dbUser.role) || dbUser.status !== 'active') {
    const loginUrl = new URL('/admin/login', request.url);
    if (!pathname.startsWith('/api/')) {
      loginUrl.searchParams.set('redirect', pathname);
    }
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 })
      : NextResponse.redirect(loginUrl);
    response.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
