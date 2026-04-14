CREATE TABLE IF NOT EXISTS "themes" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar NOT NULL,
  "light" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "dark" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "fonts" jsonb DEFAULT '{"headingFont":"Inter","bodyFont":"Inter"}'::jsonb,
  "is_built_in" boolean DEFAULT false NOT NULL,
  "created_by" varchar,
  "updated_by" varchar,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "selected_theme_id" varchar;
