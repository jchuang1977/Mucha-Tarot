import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const aiConfig = sqliteTable('ai_config', {
  id: integer('id').primaryKey(),
  baseUrl: text('base_url').notNull(), model: text('model').notNull(),
  apiKeyCiphertext: text('api_key_ciphertext').notNull(), apiKeyIv: text('api_key_iv').notNull(),
  version: integer('version').notNull().default(1), lastTestedAt: text('last_tested_at').notNull(),
  updatedBy: text('updated_by').notNull(), updatedAt: text('updated_at').notNull(),
});

export const dailyReadings = sqliteTable('daily_readings', {
  cacheKey: text('cache_key').primaryKey(), date: text('date').notNull(), cardId: text('card_id').notNull(),
  orientation: text('orientation').notNull(), configVersion: integer('config_version').notNull(),
  promptVersion: integer('prompt_version').notNull(), contentJson: text('content_json'), status: text('status').notNull(),
  leaseUntil: text('lease_until'), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
}, (table) => [uniqueIndex('idx_daily_readings_identity').on(
  table.date, table.cardId, table.orientation, table.configVersion, table.promptVersion,
)]);

export const adminCredentials = sqliteTable('admin_credentials', {
  id: integer('id').primaryKey(),
  username: text('username').notNull(),
  passwordHash: text('password_hash').notNull(),
  passwordSalt: text('password_salt').notNull(),
  passwordIterations: integer('password_iterations').notNull(),
  sessionVersion: integer('session_version').notNull().default(1),
  updatedBy: text('updated_by').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [uniqueIndex('idx_admin_credentials_username').on(table.username)]);

export const adminLoginAttempts = sqliteTable('admin_login_attempts', {
  clientHash: text('client_hash').primaryKey(),
  attempts: integer('attempts').notNull(),
  windowStartedAt: text('window_started_at').notNull(),
  lockedUntil: text('locked_until'),
  updatedAt: text('updated_at').notNull(),
});
