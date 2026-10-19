CREATE TABLE `plant_progress` (
	`user_id` text PRIMARY KEY NOT NULL,
	`best_score` integer DEFAULT 0 NOT NULL,
	`best_practice_score` integer DEFAULT 0 NOT NULL,
	`normal_attempts` integer DEFAULT 0 NOT NULL,
	`has_failed` integer DEFAULT false NOT NULL,
	`practice_started` integer DEFAULT false NOT NULL,
	`practice_completed` integer DEFAULT false NOT NULL,
	`easy_completed` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
