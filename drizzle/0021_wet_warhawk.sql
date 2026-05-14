CREATE TABLE `bupa_code_branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bupa_code_id` int NOT NULL,
	`icd_branch_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bupa_code_branches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bupa_prerequisite_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bupa_prerequisite_id` int NOT NULL,
	`icd_code_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bupa_prerequisite_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bupa_code_branches` ADD CONSTRAINT `bupa_code_branches_bupa_code_id_bupa_prerequisite_codes_id_fk` FOREIGN KEY (`bupa_code_id`) REFERENCES `bupa_prerequisite_codes`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `bupa_code_branches` ADD CONSTRAINT `bupa_code_branches_icd_branch_id_icd_branches_id_fk` FOREIGN KEY (`icd_branch_id`) REFERENCES `icd_branches`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `bupa_prerequisite_codes` ADD CONSTRAINT `bupa_prerequisite_codes_bupa_prerequisite_id_bupa_prerequisites_id_fk` FOREIGN KEY (`bupa_prerequisite_id`) REFERENCES `bupa_prerequisites`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `bupa_prerequisite_codes` ADD CONSTRAINT `bupa_prerequisite_codes_icd_code_id_icd_codes_id_fk` FOREIGN KEY (`icd_code_id`) REFERENCES `icd_codes`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `idx_bupa_code_branch_bupa_code` ON `bupa_code_branches` (`bupa_code_id`);--> statement-breakpoint
CREATE INDEX `idx_bupa_code_branch_icd_branch` ON `bupa_code_branches` (`icd_branch_id`);--> statement-breakpoint
CREATE INDEX `idx_bupa_prereq_id` ON `bupa_prerequisite_codes` (`bupa_prerequisite_id`);--> statement-breakpoint
CREATE INDEX `idx_bupa_icd_code_id` ON `bupa_prerequisite_codes` (`icd_code_id`);