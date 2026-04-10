ALTER TABLE deals ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_external_id ON deals (external_id) WHERE external_id IS NOT NULL;
