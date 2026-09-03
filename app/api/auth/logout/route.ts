import { NextResponse } from 'next/server';

export async function POST() {
  const cookieName = process.env.AUTH_COOKIE_NAME || 'wabulk_session';
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

  response.cookies.set({
    name: cookieName,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
