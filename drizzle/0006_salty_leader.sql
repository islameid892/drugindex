ALTER TABLE `non_covered_codes` ADD `icd_code_id` int;--> statement-breakpoint
ALTER TABLE `non_covered_codes` ADD `icd_branch_id` int;--> statement-breakpoint
ALTER TABLE `non_covered_codes` ADD CONSTRAINT `non_covered_codes_icd_code_id_icd_codes_id_fk` FOREIGN KEY (`icd_code_id`) REFERENCES `icd_codes`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `non_covered_codes` ADD CONSTRAINT `non_covered_codes_icd_branch_id_icd_branches_id_fk` FOREIGN KEY (`icd_branch_id`) REFERENCES `icd_branches`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `idx_non_covered_icd_code` ON `non_covered_codes` (`icd_code_id`);--> statement-breakpoint
CREATE INDEX `idx_non_covered_icd_branch` ON `non_covered_codes` (`icd_branch_id`);