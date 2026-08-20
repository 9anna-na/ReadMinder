ALTER TABLE `reminders` ADD `locale` text DEFAULT 'zh' NOT NULL;--> statement-breakpoint
ALTER TABLE `reminders` ADD `scheduled_for` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reminders` ADD `scheduled_email_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_reminders_status_scheduled` ON `reminders` (`status`,`scheduled_for`);