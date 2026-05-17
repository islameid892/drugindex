CREATE TABLE `drug_lens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scientific_name` varchar(500) NOT NULL,
	`trade_name` varchar(500) NOT NULL,
	`form` varchar(100),
	`price` varchar(100),
	`pharmacological_action` text,
	`black_box_warning` text,
	`uses` text,
	`pregnancy_category` varchar(50),
	`standard_dose` text,
	`adjusted_dose` text,
	`neonatal_dose` text,
	`dose_source` text,
	`contraindicated_interactions` text,
	`major_interactions` text,
	`moderate_interactions` text,
	`minor_interactions` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drug_lens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feature_usage_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`feature_name` varchar(100) NOT NULL,
	`session_id` varchar(128),
	`user_id` int,
	`ip_address` varchar(45),
	`user_agent` text,
	`referrer` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feature_usage_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` varchar(128) NOT NULL,
	`user_id` int,
	`ip_address` varchar(45),
	`user_agent` text,
	`last_seen_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_sessions_session_id_unique` UNIQUE(`session_id`)
);
--> statement-breakpoint
ALTER TABLE `non_covered_codes` ADD `icd_code_id` int;--> statement-breakpoint
ALTER TABLE `non_covered_codes` ADD `icd_branch_id` int;--> statement-breakpoint
ALTER TABLE `search_analytics` ADD `source` varchar(50) DEFAULT 'main' NOT NULL;--> statement-breakpoint
ALTER TABLE `search_analytics` ADD `response_time_ms` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `search_analytics` ADD `ip_address` varchar(45);--> statement-breakpoint
ALTER TABLE `feature_usage_tracking` ADD CONSTRAINT `feature_usage_tracking_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_drug_lens_sci_name` ON `drug_lens` (`scientific_name`);--> statement-breakpoint
CREATE INDEX `idx_drug_lens_trade_name` ON `drug_lens` (`trade_name`);--> statement-breakpoint
CREATE INDEX `idx_drug_lens_form` ON `drug_lens` (`form`);--> statement-breakpoint
CREATE INDEX `idx_feature_usage_feature` ON `feature_usage_tracking` (`feature_name`);--> statement-breakpoint
CREATE INDEX `idx_feature_usage_session` ON `feature_usage_tracking` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_feature_usage_user` ON `feature_usage_tracking` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_feature_usage_created` ON `feature_usage_tracking` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_user_sessions_session` ON `user_sessions` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_user_sessions_user` ON `user_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_sessions_last_seen` ON `user_sessions` (`last_seen_at`);--> statement-breakpoint
CREATE INDEX `idx_user_sessions_created` ON `user_sessions` (`created_at`);--> statement-breakpoint
ALTER TABLE `non_covered_codes` ADD CONSTRAINT `non_covered_codes_icd_code_id_icd_codes_id_fk` FOREIGN KEY (`icd_code_id`) REFERENCES `icd_codes`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `non_covered_codes` ADD CONSTRAINT `non_covered_codes_icd_branch_id_icd_branches_id_fk` FOREIGN KEY (`icd_branch_id`) REFERENCES `icd_branches`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `idx_non_covered_icd_code` ON `non_covered_codes` (`icd_code_id`);--> statement-breakpoint
CREATE INDEX `idx_non_covered_icd_branch` ON `non_covered_codes` (`icd_branch_id`);--> statement-breakpoint
CREATE INDEX `idx_search_analytics_user` ON `search_analytics` (`user_id`);