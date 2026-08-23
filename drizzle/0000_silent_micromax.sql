CREATE TABLE `ai_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`base_url` text NOT NULL,
	`model` text NOT NULL,
	`api_key_ciphertext` text NOT NULL,
	`api_key_iv` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`last_tested_at` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_readings` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`card_id` text NOT NULL,
	`orientation` text NOT NULL,
	`config_version` integer NOT NULL,
	`prompt_version` integer NOT NULL,
	`content_json` text,
	`status` text NOT NULL,
	`lease_until` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_daily_readings_identity` ON `daily_readings` (`date`,`card_id`,`orientation`,`config_version`,`prompt_version`);