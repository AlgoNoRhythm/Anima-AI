ALTER TABLE "personalities" ALTER COLUMN "model_provider" SET DEFAULT 'anthropic';--> statement-breakpoint
ALTER TABLE "personalities" ALTER COLUMN "model_name" SET DEFAULT 'claude-haiku-4-5-20251001';--> statement-breakpoint
ALTER TABLE "themes" ALTER COLUMN "primary_color" SET DEFAULT '#eab308';--> statement-breakpoint
ALTER TABLE "themes" ALTER COLUMN "background_color" SET DEFAULT '#fffdf9';--> statement-breakpoint
ALTER TABLE "themes" ADD COLUMN "action_button_label" text DEFAULT 'Open PDF' NOT NULL;