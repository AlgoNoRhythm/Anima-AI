CREATE TABLE IF NOT EXISTS "feedback_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"star_rating_enabled" boolean DEFAULT true NOT NULL,
	"star_rating_label" text DEFAULT 'How would you rate your experience?' NOT NULL,
	"star_rating_required" boolean DEFAULT false NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submit_button_label" text DEFAULT 'Submit Feedback' NOT NULL,
	"thank_you_message" text DEFAULT 'Thank you for your feedback!' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" uuid,
	"star_rating" integer,
	"answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "themes" ADD COLUMN "suggested_questions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback_configs" ADD CONSTRAINT "feedback_configs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_configs_project_id_idx" ON "feedback_configs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_responses_project_id_idx" ON "feedback_responses" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_responses_created_at_idx" ON "feedback_responses" USING btree ("created_at");