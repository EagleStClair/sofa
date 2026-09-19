ALTER TABLE `titles` ADD `imdbRating` real;--> statement-breakpoint
DROP INDEX IF EXISTS `integrationEvents_integrationId_receivedAt`;--> statement-breakpoint
DROP INDEX IF EXISTS `integrations_userId_provider`;--> statement-breakpoint
DROP INDEX IF EXISTS `integrations_token`;--> statement-breakpoint
DROP INDEX IF EXISTS `titleRecommendations_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `titleRecommendations_titleId_rank`;--> statement-breakpoint
DROP TABLE `integrationEvents`;--> statement-breakpoint
DROP TABLE `integrations`;--> statement-breakpoint
DROP TABLE `titleRecommendations`;