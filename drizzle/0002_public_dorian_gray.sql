ALTER TABLE `users` ADD `display_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `is_admin` integer DEFAULT false NOT NULL;--> statement-breakpoint
INSERT OR IGNORE INTO `users` (`id`, `username`, `username_normalized`, `display_name`, `password_hash`, `password_salt`, `password_iterations`, `is_admin`)
VALUES ('admin-account', 'admin', 'admin', '관리자', 'ApMRcDs5cVvHA2aFoy6sI9K3qMSzNTlNySm0BAgebv4=', 'wDnnvWDQcOHV+Y+ZwIjDWg==', 100000, 1);
