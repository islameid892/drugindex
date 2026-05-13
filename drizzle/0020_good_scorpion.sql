CREATE TABLE `bupa_prerequisites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`service_name` varchar(255) NOT NULL,
	`icd_codes` varchar(500) NOT NULL,
	`requirements` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bupa_prerequisites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_bupa_service_name` ON `bupa_prerequisites` (`service_name`);--> statement-breakpoint
CREATE INDEX `idx_bupa_icd_codes` ON `bupa_prerequisites` (`icd_codes`);