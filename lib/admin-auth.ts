const encoder = new TextEncoder();

export const ADMIN_SESSION_COOKIE = 'twilight_admin_session';
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
// Cloudflare Workers Web Crypto supports PBKDF2 iteration counts up to 100,000.
export const PASSWORD_ITERATIONS = 100_000;

export type AdminSessionPayload = {
  username: string;
  sessionVersion: number;
  expiresAt: number;
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(base64);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function derivePasswordHash(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBuffer, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashAdminPassword(password: string): Promise<{
  hash: string; salt: string; iterations: number;
}> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordHash(password, salt, PASSWORD_ITERATIONS);
  return { hash: bytesToBase64Url(hash), salt: bytesToBase64Url(salt), iterations: PASSWORD_ITERATIONS };
}

export async function verifyAdminPassword(input: {
  password: string; hash: string; salt: string; iterations: number;
}): Promise<boolean> {
  if (!Number.isInteger(input.iterations) || input.iterations !== PASSWORD_ITERATIONS) return false;
  const salt = base64UrlToBytes(input.salt);
  const expected = base64UrlToBytes(input.hash);
  if (!salt || !expected) return false;
  const actual = await derivePasswordHash(input.password, salt, input.iterations);
  return equalBytes(actual, expected);
}

async function hmac(value: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

export async function createAdminSessionToken(
  input: { username: string; sessionVersion: number; now?: number },
  secret: string,
): Promise<string> {
  if (secret.length < 32) throw new Error('ADMIN_SESSION_SECRET 至少需要 32 個字元');
  const payload: AdminSessionPayload = {
    username: input.username,
    sessionVersion: input.sessionVersion,
    expiresAt: Math.floor((input.now ?? Date.now()) / 1000) + ADMIN_SESSION_SECONDS,
  };
  const encoded = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = bytesToBase64Url(await hmac(`v1.${encoded}`, secret));
  return `v1.${encoded}.${signature}`;
}

export async function verifyAdminSessionToken(
  token: string,
  secret: string,
  now = Date.now(),
): Promise<AdminSessionPayload | null> {
  if (secret.length < 32) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return null;
  const signature = base64UrlToBytes(parts[2]);
  if (!signature || !equalBytes(signature, await hmac(`v1.${parts[1]}`, secret))) return null;
  const payloadBytes = base64UrlToBytes(parts[1]);
  if (!payloadBytes) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as Partial<AdminSessionPayload>;
    if (typeof payload.username !== 'string' || !payload.username ||
      !Number.isInteger(payload.sessionVersion) || typeof payload.expiresAt !== 'number' ||
      payload.expiresAt <= Math.floor(now / 1000)) return null;
    return payload as AdminSessionPayload;
  } catch {
    return null;
  }
}

export function normalizeAdminUsername(value: string): string | null {
  const username = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9._-]{2,39}$/.test(username) ? username : null;
}

export async function hashAdminClientIdentity(request: Request, secret: string): Promise<string> {
  const forwarded = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const identity = `${forwarded ?? 'unknown'}|${request.headers.get('user-agent') ?? 'unknown'}`;
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${secret}|${identity}`));
  return bytesToBase64Url(new Uint8Array(digest));
}
