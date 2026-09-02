CREATE TABLE `jobs` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`serverId` int,
	`text` text NOT NULL,
	`language` varchar(16) NOT NULL,
	`format` enum('mp3','wav') NOT NULL DEFAULT 'mp3',
	`status` enum('queued','processing','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
	`processingTime` float,
	`filePath` varchar(500),
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`startedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `servers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`host` varchar(255) NOT NULL,
	`port` int NOT NULL DEFAULT 8000,
	`status` enum('online','offline','degraded') NOT NULL DEFAULT 'offline',
	`enabled` boolean NOT NULL DEFAULT true,
	`weight` int NOT NULL DEFAULT 1,
	`lastHealthCheck` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `servers_id` PRIMARY KEY(`id`)
);
