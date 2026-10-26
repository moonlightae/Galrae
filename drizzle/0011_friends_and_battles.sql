CREATE TABLE `battles` (
	`id` text PRIMARY KEY NOT NULL,
	`host_id` text NOT NULL,
	`guest_id` text NOT NULL,
	`kingdom` text NOT NULL,
	`queue` text NOT NULL,
	`classified` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`winner_id` text,
	`reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`host_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guest_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "battle_distinct_players" CHECK("battles"."host_id" <> "battles"."guest_id")
);
--> statement-breakpoint
CREATE INDEX `idx_battles_host` ON `battles` (`host_id`);--> statement-breakpoint
CREATE INDEX `idx_battles_guest` ON `battles` (`guest_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_battles_open_pair` ON `battles` (min(`host_id`, `guest_id`), max(`host_id`, `guest_id`)) WHERE `status` IN ('waiting', 'active');--> statement-breakpoint
CREATE TABLE `friendships` (
	`user_a` text NOT NULL,
	`user_b` text NOT NULL,
	`requested_by` text NOT NULL,
	`accepted` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`user_a`, `user_b`),
	FOREIGN KEY (`user_a`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_b`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "friend_pair_order" CHECK("friendships"."user_a" < "friendships"."user_b"),
	CONSTRAINT "friend_request_participant" CHECK("friendships"."requested_by" IN ("friendships"."user_a", "friendships"."user_b"))
);
--> statement-breakpoint
CREATE INDEX `idx_friendships_user_b` ON `friendships` (`user_b`);
