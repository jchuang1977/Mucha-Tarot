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
