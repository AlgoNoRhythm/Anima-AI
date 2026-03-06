ALTER TABLE "feedback_configs" ADD COLUMN "ratings" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback_configs" DROP COLUMN IF EXISTS "star_rating_enabled";--> statement-breakpoint
ALTER TABLE "feedback_configs" DROP COLUMN IF EXISTS "star_rating_label";--> statement-breakpoint
ALTER TABLE "feedback_configs" DROP COLUMN IF EXISTS "star_rating_required";--> statement-breakpoint
ALTER TABLE "feedback_responses" ADD COLUMN "ratings" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback_responses" DROP COLUMN IF EXISTS "star_rating";
