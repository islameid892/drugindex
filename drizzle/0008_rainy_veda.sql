CREATE TABLE `sila_api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key_hash` varchar(255) NOT NULL,
	`key_name` varchar(100) NOT NULL,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`last_used_at` timestamp,
	`usage_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sila_api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `sila_api_keys_key_hash_unique` UNIQUE(`key_hash`)
);
--> statement-breakpoint
CREATE INDEX `idx_sila_key_hash` ON `sila_api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `idx_sila_is_active` ON `sila_api_keys` (`is_active`);