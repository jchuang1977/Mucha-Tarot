import { env } from 'cloudflare:workers';
import type { Orientation, ReadingContent } from './types';

export type AiConfigRecord = {
  id: number; base_url: string; model: string; api_key_ciphertext: string; api_key_iv: string;
  version: number; last_tested_at: string; updated_by: string; updated_at: string;
};

export type AdminCredentialRecord = {
  id: number; username: string; password_hash: string; password_salt: string;
  password_iterations: number; session_version: number; updated_by: string; updated_at: string;
};

type AdminLoginAttemptRecord = {
  client_hash: string; attempts: number; window_started_at: string;
  locked_until: string | null; updated_at: string;
};

let schemaPromise: Promise<void> | null = null;

export function ensureDatabase(): Promise<void> {
  if (!schemaPromise) schemaPromise = initializeDatabase().catch((error) => { schemaPromise = null; throw error; });
  return schemaPromise;
}

async function initializeDatabase() {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS ai_config (
      id INTEGER PRIMARY KEY, base_url TEXT NOT NULL, model TEXT NOT NULL,
      api_key_ciphertext TEXT NOT NULL, api_key_iv TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
      last_tested_at TEXT NOT NULL, updated_by TEXT NOT NULL, updated_at TEXT NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS daily_readings (
      cache_key TEXT PRIMARY KEY, date TEXT NOT NULL, card_id TEXT NOT NULL, orientation TEXT NOT NULL,
      config_version INTEGER NOT NULL, prompt_version INTEGER NOT NULL, content_json TEXT,
      status TEXT NOT NULL, lease_until TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`),
    env.DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_readings_identity
      ON daily_readings(date, card_id, orientation, config_version, prompt_version)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_credentials (
      id INTEGER PRIMARY KEY, username TEXT NOT NULL,
      password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, password_iterations INTEGER NOT NULL,
      session_version INTEGER NOT NULL DEFAULT 1, updated_by TEXT NOT NULL, updated_at TEXT NOT NULL
    )`),
    env.DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_credentials_username
      ON admin_credentials(username)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_login_attempts (
      client_hash TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_started_at TEXT NOT NULL,
      locked_until TEXT, updated_at TEXT NOT NULL
    )`),
  ]);
  await env.DB.prepare('PRAGMA optimize').run();
}

export async function getAdminCredential(): Promise<AdminCredentialRecord | null> {
  await ensureDatabase();
  return env.DB.prepare('SELECT * FROM admin_credentials WHERE id = 1').first<AdminCredentialRecord>();
}

export async function getAdminCredentialByUsername(username: string): Promise<AdminCredentialRecord | null> {
  await ensureDatabase();
  return env.DB.prepare('SELECT * FROM admin_credentials WHERE username = ?')
    .bind(username).first<AdminCredentialRecord>();
}

export async function saveAdminCredential(input: {
  username: string; passwordHash: string; passwordSalt: string; passwordIterations: number; updatedBy: string;
}): Promise<AdminCredentialRecord> {
  await ensureDatabase();
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO admin_credentials
    (id, username, password_hash, password_salt, password_iterations, session_version, updated_by, updated_at)
    VALUES (1, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET username=excluded.username, password_hash=excluded.password_hash,
      password_salt=excluded.password_salt, password_iterations=excluded.password_iterations,
      session_version=admin_credentials.session_version + 1, updated_by=excluded.updated_by,
      updated_at=excluded.updated_at`)
    .bind(input.username, input.passwordHash, input.passwordSalt, input.passwordIterations, input.updatedBy, now).run();
  const saved = await getAdminCredential();
  if (!saved) throw new Error('管理員憑證儲存失敗');
  return saved;
}

export async function getAdminLoginAttempt(clientHash: string): Promise<AdminLoginAttemptRecord | null> {
  await ensureDatabase();
  return env.DB.prepare('SELECT * FROM admin_login_attempts WHERE client_hash = ?')
    .bind(clientHash).first<AdminLoginAttemptRecord>();
}

export async function saveAdminLoginAttempt(input: {
  clientHash: string; attempts: number; windowStartedAt: string; lockedUntil: string | null;
}): Promise<void> {
  await ensureDatabase();
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO admin_login_attempts
    (client_hash, attempts, window_started_at, locked_until, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(client_hash) DO UPDATE SET attempts=excluded.attempts,
      window_started_at=excluded.window_started_at, locked_until=excluded.locked_until,
      updated_at=excluded.updated_at`)
    .bind(input.clientHash, input.attempts, input.windowStartedAt, input.lockedUntil, now).run();
}

export async function clearAdminLoginAttempt(clientHash: string): Promise<void> {
  await ensureDatabase();
  await env.DB.prepare('DELETE FROM admin_login_attempts WHERE client_hash = ?').bind(clientHash).run();
}

export async function getAiConfig(): Promise<AiConfigRecord | null> {
  await ensureDatabase();
  return env.DB.prepare('SELECT * FROM ai_config WHERE id = 1').first<AiConfigRecord>();
}

export async function saveAiConfig(input: {
  baseUrl: string; model: string; ciphertext: string; iv: string; updatedBy: string;
}): Promise<number> {
  await ensureDatabase();
  const now = new Date().toISOString();
  const current = await getAiConfig();
  const version = (current?.version ?? 0) + 1;
  await env.DB.prepare(`INSERT INTO ai_config
    (id, base_url, model, api_key_ciphertext, api_key_iv, version, last_tested_at, updated_by, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET base_url=excluded.base_url, model=excluded.model,
      api_key_ciphertext=excluded.api_key_ciphertext, api_key_iv=excluded.api_key_iv,
      version=excluded.version, last_tested_at=excluded.last_tested_at,
      updated_by=excluded.updated_by, updated_at=excluded.updated_at`)
    .bind(input.baseUrl, input.model, input.ciphertext, input.iv, version, now, input.updatedBy, now).run();
  return version;
}

export async function getReadyReading(cacheKey: string): Promise<ReadingContent | null> {
  await ensureDatabase();
  const row = await env.DB.prepare(
    "SELECT content_json FROM daily_readings WHERE cache_key = ? AND status = 'ready'",
  ).bind(cacheKey).first<{ content_json: string | null }>();
  if (!row?.content_json) return null;
  try { return JSON.parse(row.content_json) as ReadingContent; } catch { return null; }
}

export async function claimReading(input: {
  cacheKey: string; date: string; cardId: string; orientation: Orientation;
  configVersion: number; promptVersion: number;
}): Promise<'claimed' | 'busy'> {
  await ensureDatabase();
  const now = new Date();
  const nowIso = now.toISOString();
  const leaseUntil = new Date(now.getTime() + 35_000).toISOString();
  const inserted = await env.DB.prepare(`INSERT OR IGNORE INTO daily_readings
    (cache_key, date, card_id, orientation, config_version, prompt_version, status, lease_until, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'generating', ?, ?, ?)`)
    .bind(input.cacheKey, input.date, input.cardId, input.orientation, input.configVersion, input.promptVersion, leaseUntil, nowIso, nowIso).run();
  if ((inserted.meta.changes ?? 0) > 0) return 'claimed';

  const reclaimed = await env.DB.prepare(`UPDATE daily_readings SET lease_until = ?, updated_at = ?
    WHERE cache_key = ? AND status = 'generating' AND lease_until < ?`)
    .bind(leaseUntil, nowIso, input.cacheKey, nowIso).run();
  return (reclaimed.meta.changes ?? 0) > 0 ? 'claimed' : 'busy';
}

export async function storeReadyReading(cacheKey: string, reading: ReadingContent): Promise<void> {
  await env.DB.prepare(`UPDATE daily_readings SET status = 'ready', content_json = ?, lease_until = NULL, updated_at = ?
    WHERE cache_key = ?`).bind(JSON.stringify(reading), new Date().toISOString(), cacheKey).run();
}

export async function releaseReading(cacheKey: string): Promise<void> {
  await env.DB.prepare("DELETE FROM daily_readings WHERE cache_key = ? AND status = 'generating'").bind(cacheKey).run();
}

export async function pruneReadings(currentDate: string): Promise<void> {
  const cutoff = new Date(`${currentDate}T00:00:00+08:00`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  await env.DB.prepare('DELETE FROM daily_readings WHERE date < ?').bind(cutoffDate).run();
}
