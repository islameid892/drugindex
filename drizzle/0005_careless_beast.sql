CREATE TABLE `drug_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scientific_name` varchar(500) NOT NULL,
	`trade_name` varchar(500) NOT NULL,
	`indication` varchar(500) NOT NULL,
	`icd_codes_raw` varchar(1000) NOT NULL DEFAULT '',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `drug_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drug_entry_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`drug_entry_id` int NOT NULL,
	`code_id` int NOT NULL,
	CONSTRAINT `drug_entry_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `icd_branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parent_code_id` int NOT NULL,
	`branch_code` varchar(20) NOT NULL,
	`branch_description` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `icd_branches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `icd_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(20) NOT NULL,
	`description` text NOT NULL,
	`branch_count` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `icd_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `icd_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `non_covered_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(20) NOT NULL,
	`description` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `non_covered_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `non_covered_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `search_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`query` varchar(500) NOT NULL,
	`results_count` int NOT NULL DEFAULT 0,
	`search_type` varchar(50) NOT NULL DEFAULT 'general',
	`response_time_ms` int NOT NULL DEFAULT 0,
	`user_id` int,
	`ip_address` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `search_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` varchar(128) NOT NULL,
	`user_id` int,
	`ip_address` varchar(45),
	`user_agent` text,
	`last_seen_at` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_sessions_session_id_unique` UNIQUE(`session_id`)
);
--> statement-breakpoint
DROP TABLE `codes`;--> statement-breakpoint
DROP TABLE `conditions`;--> statement-breakpoint
DROP TABLE `medications`;--> statement-breakpoint
DROP TABLE `nonCoveredCodes`;--> statement-breakpoint
DROP TABLE `searchAnalytics`;--> statement-breakpoint
DROP TABLE `userSessions`;--> statement-breakpoint
ALTER TABLE `drug_entry_codes` ADD CONSTRAINT `drug_entry_codes_drug_entry_id_drug_entries_id_fk` FOREIGN KEY (`drug_entry_id`) REFERENCES `drug_entries`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `drug_entry_codes` ADD CONSTRAINT `drug_entry_codes_code_id_icd_codes_id_fk` FOREIGN KEY (`code_id`) REFERENCES `icd_codes`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `icd_branches` ADD CONSTRAINT `icd_branches_parent_code_id_icd_codes_id_fk` FOREIGN KEY (`parent_code_id`) REFERENCES `icd_codes`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `search_analytics` ADD CONSTRAINT `search_analytics_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_drug_sci_name` ON `drug_entries` (`scientific_name`);--> statement-breakpoint
CREATE INDEX `idx_drug_trade_name` ON `drug_entries` (`trade_name`);--> statement-breakpoint
CREATE INDEX `idx_drug_indication` ON `drug_entries` (`indication`);--> statement-breakpoint
CREATE INDEX `idx_dec_drug_entry_id` ON `drug_entry_codes` (`drug_entry_id`);--> statement-breakpoint
CREATE INDEX `idx_dec_code_id` ON `drug_entry_codes` (`code_id`);--> statement-breakpoint
CREATE INDEX `idx_icd_branches_parent` ON `icd_branches` (`parent_code_id`);--> statement-breakpoint
CREATE INDEX `idx_icd_branches_code` ON `icd_branches` (`branch_code`);--> statement-breakpoint
CREATE INDEX `idx_icd_codes_code` ON `icd_codes` (`code`);--> statement-breakpoint
CREATE INDEX `idx_non_covered_code` ON `non_covered_codes` (`code`);--> statement-breakpoint
CREATE INDEX `idx_search_analytics_query` ON `search_analytics` (`query`);--> statement-breakpoint
CREATE INDEX `idx_search_analytics_created` ON `search_analytics` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_search_analytics_user` ON `search_analytics` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_sessions_session` ON `user_sessions` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_user_sessions_user` ON `user_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_sessions_last_seen` ON `user_sessions` (`last_seen_at`);