CREATE TABLE `uploaded_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_size` int NOT NULL,
	`file_type` varchar(50) NOT NULL,
	`s3_key` text NOT NULL,
	`s3_url` text NOT NULL,
	`uploaded_by` varchar(255),
	`uploaded_at` timestamp DEFAULT (now()),
	`downloads` int DEFAULT 0,
	`description` text,
	CONSTRAINT `uploaded_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_uploaded_files_uploaded_at` ON `uploaded_files` (`uploaded_at`);--> statement-breakpoint
CREATE INDEX `idx_uploaded_files_uploaded_by` ON `uploaded_files` (`uploaded_by`);--> statement-breakpoint
CREATE INDEX `idx_uploaded_files_file_type` ON `uploaded_files` (`file_type`);