CREATE TABLE `searchAnalytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`query` varchar(255) NOT NULL,
	`resultsCount` int NOT NULL DEFAULT 0,
	`responseTime` int NOT NULL DEFAULT 0,
	`userId` int,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `searchAnalytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`sessionStart` timestamp NOT NULL DEFAULT (now()),
	`sessionEnd` timestamp,
	`isActive` boolean DEFAULT true,
	CONSTRAINT `userSessions_id` PRIMARY KEY(`id`)
);
