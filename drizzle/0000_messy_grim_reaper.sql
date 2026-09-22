CREATE TABLE `leaderboard` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`best_score` integer DEFAULT 0 NOT NULL,
	`games_played` integer DEFAULT 0 NOT NULL,
	`achieved_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_leaderboard_rank` ON `leaderboard` (`best_score`,`achieved_at`);