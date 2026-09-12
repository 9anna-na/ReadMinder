CREATE TABLE `line_connections` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`line_user_id` text NOT NULL,
	`connected_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `line_connections_line_user_id_unique` ON `line_connections` (`line_user_id`);--> statement-breakpoint
CREATE TABLE `line_link_codes` (
	`code` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `line_link_codes_owner_id_unique` ON `line_link_codes` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_line_link_codes_expires` ON `line_link_codes` (`expires_at`);--> statement-breakpoint
ALTER TABLE `reminders` ADD `recipient_line_user_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reminders` ADD `delivered_at` text DEFAULT '' NOT NULL;