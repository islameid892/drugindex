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
ALTER TABLE `feature_usage_tracking` ADD CONSTRAINT `feature_usage_tracking_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_feature_usage_feature` ON `feature_usage_tracking` (`feature_name`);--> statement-breakpoint
CREATE INDEX `idx_feature_usage_session` ON `feature_usage_tracking` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_feature_usage_user` ON `feature_usage_tracking` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_feature_usage_created` ON `feature_usage_tracking` (`created_at`);