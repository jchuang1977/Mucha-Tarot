import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { createAdminSession } from '../../../../../lib/admin';
import { hashAdminClientIdentity, normalizeAdminUsername, verifyAdminPassword } from '../../../../../lib/admin-auth';
import {
  clearAdminLoginAttempt, getAdminCredentialByUsername, getAdminLoginAttempt, saveAdminLoginAttempt,
} from '../../../../../lib/database';

export const dynamic = 'force-dynamic';

const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const clientHash = await hashAdminClientIdentity(request, env.ADMIN_SESSION_SECRET);
  const now = Date.now();
  const attempt = await getAdminLoginAttempt(clientHash);
  if (attempt?.locked_until && Date.parse(attempt.locked_until) > now) {
    const retryAfter = Math.max(1, Math.ceil((Date.parse(attempt.locked_until) - now) / 1000));
    return NextResponse.json({ error: '嘗試次數過多，請稍後再試' }, {
      status: 429,
      headers: { 'retry-after': String(retryAfter) },
    });
  }

  let body: { username?: unknown; password?: unknown };
  try { body = await request.json() as typeof body; } catch { return error('請輸入帳號與密碼', 400); }
  const username = typeof body.username === 'string' ? normalizeAdminUsername(body.username) : null;
  const password = typeof body.password === 'string' ? body.password : '';
  const credential = username ? await getAdminCredentialByUsername(username) : null;
  const valid = Boolean(credential) && password.length <= 200 && await verifyAdminPassword({
    password,
    hash: credential!.password_hash,
    salt: credential!.password_salt,
    iterations: credential!.password_iterations,
  });

  if (!valid || !credential) {
    const windowStart = attempt && now - Date.parse(attempt.window_started_at) < WINDOW_MS
      ? attempt.window_started_at : new Date(now).toISOString();
    const failures = attempt && windowStart === attempt.window_started_at ? attempt.attempts + 1 : 1;
    await saveAdminLoginAttempt({
      clientHash,
      attempts: failures,
      windowStartedAt: windowStart,
      lockedUntil: failures >= MAX_ATTEMPTS ? new Date(now + LOCK_MS).toISOString() : null,
    });
    return error(
      failures >= MAX_ATTEMPTS ? '嘗試次數過多，請 15 分鐘後再試' : '帳號或密碼不正確',
      failures >= MAX_ATTEMPTS ? 429 : 401,
    );
  }

  await clearAdminLoginAttempt(clientHash);
  const session = await createAdminSession(credential.username, credential.session_version);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(session.name, session.value, session.options);
  return response;
}
