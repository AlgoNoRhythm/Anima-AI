ALTER TABLE "themes" ADD COLUMN "translations" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "personalities" ADD COLUMN "translations" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "feedback_configs" ADD COLUMN "translations" jsonb DEFAULT '{}'::jsonb NOT NULL;
