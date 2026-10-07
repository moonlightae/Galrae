ALTER TABLE `leaderboard` ADD `normal_attempts` integer;--> statement-breakpoint
ALTER TABLE `leaderboard` ADD `has_failed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `leaderboard` ADD `practice_started` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `leaderboard` ADD `practice_completed` integer DEFAULT false NOT NULL;