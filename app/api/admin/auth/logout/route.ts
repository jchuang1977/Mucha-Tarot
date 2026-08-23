import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '../../../../../lib/admin-auth';

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/admin/login', request.url), 303);
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: env.SITE_ORIGIN.startsWith('https://'),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
