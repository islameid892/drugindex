DROP TABLE `drug_lens`;--> statement-breakpoint
DROP TABLE `feature_usage_tracking`;--> statement-breakpoint
DROP TABLE `sila_api_keys`;--> statement-breakpoint
DROP TABLE `user_sessions`;--> statement-breakpoint
ALTER TABLE `non_covered_codes` DROP FOREIGN KEY `non_covered_codes_icd_code_id_icd_codes_id_fk`;
--> statement-breakpoint
ALTER TABLE `non_covered_codes` DROP FOREIGN KEY `non_covered_codes_icd_branch_id_icd_branches_id_fk`;
--> statement-breakpoint
DROP INDEX `idx_non_covered_icd_code` ON `non_covered_codes`;--> statement-breakpoint
DROP INDEX `idx_non_covered_icd_branch` ON `non_covered_codes`;--> statement-breakpoint
DROP INDEX `idx_search_analytics_user` ON `search_analytics`;--> statement-breakpoint
ALTER TABLE `icd_codes` MODIFY COLUMN `code` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `non_covered_codes` DROP COLUMN `icd_code_id`;--> statement-breakpoint
ALTER TABLE `non_covered_codes` DROP COLUMN `icd_branch_id`;--> statement-breakpoint
ALTER TABLE `search_analytics` DROP COLUMN `source`;--> statement-breakpoint
ALTER TABLE `search_analytics` DROP COLUMN `response_time_ms`;--> statement-breakpoint
ALTER TABLE `search_analytics` DROP COLUMN `ip_address`;