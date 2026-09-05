import { NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookies } from '../../../../src/lib/auth-edge';

export async function GET(request) {
  try {
    const token = getTokenFromCookies(request);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    return NextResponse.json({
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
