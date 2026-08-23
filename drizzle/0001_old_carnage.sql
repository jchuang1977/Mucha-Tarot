CREATE TABLE `admin_credentials` (
	`id` integer PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`password_iterations` integer NOT NULL,
	`session_version` integer DEFAULT 1 NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_admin_credentials_username` ON `admin_credentials` (`username`);--> statement-breakpoint
CREATE TABLE `admin_login_attempts` (
	`client_hash` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`window_started_at` text NOT NULL,
	`locked_until` text,
	`updated_at` text NOT NULL
);
