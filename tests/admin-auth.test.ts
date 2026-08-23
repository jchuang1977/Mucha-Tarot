import { describe, expect, it } from 'vitest';
import {
  createAdminSessionToken,
  hashAdminPassword,
  normalizeAdminUsername,
  verifyAdminPassword,
  verifyAdminSessionToken,
} from '../lib/admin-auth';

const secret = 'test-session-secret-with-more-than-thirty-two-characters';

describe('admin password security', () => {
  it('hashes and verifies a password without storing the original value', async () => {
    const stored = await hashAdminPassword('A-long-admin-password-2026');
    expect(stored.iterations).toBe(100_000);
    expect(stored.hash).not.toContain('A-long-admin-password-2026');
    expect(await verifyAdminPassword({ password: 'A-long-admin-password-2026', ...stored })).toBe(true);
    expect(await verifyAdminPassword({ password: 'wrong-password', ...stored })).toBe(false);
  });

  it('normalizes only supported usernames', () => {
    expect(normalizeAdminUsername('  Twilight.Admin  ')).toBe('twilight.admin');
    expect(normalizeAdminUsername('../admin')).toBeNull();
    expect(normalizeAdminUsername('ab')).toBeNull();
  });
});

describe('admin session security', () => {
  it('accepts a signed session before expiry', async () => {
    const now = Date.UTC(2026, 7, 23);
    const token = await createAdminSessionToken({ username: 'twilight', sessionVersion: 3, now }, secret);
    await expect(verifyAdminSessionToken(token, secret, now + 1_000)).resolves.toMatchObject({
      username: 'twilight', sessionVersion: 3,
    });
  });

  it('rejects tampered and expired sessions', async () => {
    const now = Date.UTC(2026, 7, 23);
    const token = await createAdminSessionToken({ username: 'twilight', sessionVersion: 3, now }, secret);
    await expect(verifyAdminSessionToken(`${token.slice(0, -1)}x`, secret, now + 1_000)).resolves.toBeNull();
    await expect(verifyAdminSessionToken(token, secret, now + 8 * 60 * 60 * 1_000)).resolves.toBeNull();
  });
});
