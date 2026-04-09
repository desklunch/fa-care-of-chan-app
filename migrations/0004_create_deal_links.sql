CREATE TABLE IF NOT EXISTS "deal_links" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "deal_id" varchar NOT NULL REFERENCES "deals"("id") ON DELETE CASCADE,
  "url" varchar(2000) NOT NULL,
  "label" varchar(500),
  "preview_title" varchar(500),
  "preview_description" varchar(2000),
  "preview_image" varchar(2000),
  "created_by_id" varchar NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_deal_links_deal" ON "deal_links" ("deal_id");
CREATE INDEX IF NOT EXISTS "idx_deal_links_created_by" ON "deal_links" ("created_by_id");
