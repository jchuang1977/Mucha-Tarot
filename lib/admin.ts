import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, createAdminSessionToken, verifyAdminSessionToken } from './admin-auth';
import { getAdminCredentialByUsername } from './database';

export type AdminSession = { username: string; sessionVersion: number };

async function authenticateToken(token: string | undefined): Promise<AdminSession | null> {
  if (!token || !env.ADMIN_SESSION_SECRET) return null;
  const payload = await verifyAdminSessionToken(token, env.ADMIN_SESSION_SECRET);
  if (!payload) return null;
  const credential = await getAdminCredentialByUsername(payload.username);
  if (!credential || credential.session_version !== payload.sessionVersion) return null;
  return { username: credential.username, sessionVersion: credential.session_version };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  return authenticateToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export function getAdminSessionFromRequest(request: Request): Promise<AdminSession | null> {
  const cookie = request.headers.get('cookie')?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  if (!cookie) return authenticateToken(undefined);
  try {
    return authenticateToken(decodeURIComponent(cookie.slice(ADMIN_SESSION_COOKIE.length + 1)));
  } catch {
    return authenticateToken(undefined);
  }
}

export async function createAdminSession(username: string, sessionVersion: number) {
  const value = await createAdminSessionToken({ username, sessionVersion }, env.ADMIN_SESSION_SECRET);
  return {
    name: ADMIN_SESSION_COOKIE,
    value,
    options: {
      httpOnly: true,
      secure: env.SITE_ORIGIN.startsWith('https://'),
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 8 * 60 * 60,
    },
  };
}
