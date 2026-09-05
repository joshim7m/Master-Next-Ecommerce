import { NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookies, isAdminRoute, isLoginPage, isAdminApiRoute } from './src/lib/auth-edge';

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

  if (!payload || payload.role !== 'admin') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
