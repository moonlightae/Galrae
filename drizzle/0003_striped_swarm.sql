CREATE TABLE `classified_species` (
	`user_id` text NOT NULL,
	`species_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `species_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
