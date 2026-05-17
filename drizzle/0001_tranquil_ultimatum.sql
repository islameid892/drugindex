CREATE TABLE `codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(20) NOT NULL,
	`description` text NOT NULL,
	`branches` text NOT NULL,
	`relatedMedications` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `conditions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`relatedMedications` text NOT NULL,
	`relatedCodes` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conditions_id` PRIMARY KEY(`id`),
	CONSTRAINT `conditions_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `medications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scientificName` varchar(255) NOT NULL,
	`tradeNames` text NOT NULL,
	`indication` varchar(255),
	`icdCodes` text NOT NULL,
	`coverageStatus` varchar(50) NOT NULL DEFAULT 'COVERED',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nonCoveredCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(20) NOT NULL,
	`description` text NOT NULL,
	`branches` text NOT NULL,
	`relatedMedications` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nonCoveredCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `nonCoveredCodes_code_unique` UNIQUE(`code`)
);
