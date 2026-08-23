import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getChatGPTUser } from '../../../../chatgpt-auth';
import { createAdminSession } from '../../../../../lib/admin';
import { hashAdminPassword, normalizeAdminUsername } from '../../../../../lib/admin-auth';
import { saveAdminCredential } from '../../../../../lib/database';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  const ownerEmail = env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  if (!user || !ownerEmail || user.email.trim().toLowerCase() !== ownerEmail) {
    return NextResponse.json({ error: '只有網站擁有者能設定管理員帳密' }, { status: 403 });
  }

  let body: { username?: unknown; password?: unknown; passwordConfirmation?: unknown };
  try { body = await request.json() as typeof body; } catch {
    return NextResponse.json({ error: '請完整填寫設定' }, { status: 400 });
  }
  const username = typeof body.username === 'string' ? normalizeAdminUsername(body.username) : null;
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username) return NextResponse.json({ error: '帳號格式不正確' }, { status: 400 });
  if (password.length < 12 || password.length > 200) {
    return NextResponse.json({ error: '密碼需為 12–200 個字元' }, { status: 400 });
  }
  if (password !== body.passwordConfirmation) {
    return NextResponse.json({ error: '兩次輸入的密碼不一致' }, { status: 400 });
  }

  const hashed = await hashAdminPassword(password);
  const credential = await saveAdminCredential({
    username,
    passwordHash: hashed.hash,
    passwordSalt: hashed.salt,
    passwordIterations: hashed.iterations,
    updatedBy: user.email,
  });
  const session = await createAdminSession(credential.username, credential.session_version);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(session.name, session.value, session.options);
  return response;
}
