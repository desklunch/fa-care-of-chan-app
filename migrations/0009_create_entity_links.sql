CREATE TABLE IF NOT EXISTS "entity_links" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "entity_type" varchar(50) NOT NULL,
  "entity_id" varchar NOT NULL,
  "url" varchar(2000) NOT NULL,
  "label" varchar(500),
  "preview_title" varchar(500),
  "preview_description" varchar(2000),
  "preview_image" varchar(2000),
  "created_by_id" varchar NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_entity_links_entity" ON "entity_links" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_entity_links_created_by" ON "entity_links" ("created_by_id");

INSERT INTO "entity_links" ("id", "entity_type", "entity_id", "url", "label", "preview_title", "preview_description", "preview_image", "created_by_id", "created_at")
SELECT "id", 'deal', "deal_id", "url", "label", "preview_title", "preview_description", "preview_image", "created_by_id", "created_at"
FROM "deal_links"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "entity_links" ("id", "entity_type", "entity_id", "url", "label", "preview_title", "preview_description", "preview_image", "created_by_id", "created_at")
SELECT "id", 'proposal_task', "task_id", "url", "label", "preview_title", "preview_description", "preview_image", "created_by_id", "created_at"
FROM "proposal_task_links"
ON CONFLICT ("id") DO NOTHING;
