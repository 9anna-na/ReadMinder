CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`recipient_email` text NOT NULL,
	`topic` text NOT NULL,
	`source` text NOT NULL,
	`reminder_format` text NOT NULL,
	`delivery` text NOT NULL,
	`lead_days` integer NOT NULL,
	`primary_date` text DEFAULT '' NOT NULL,
	`analysis_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_reminders_owner_created` ON `reminders` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_reminders_status_date` ON `reminders` (`status`,`primary_date`);