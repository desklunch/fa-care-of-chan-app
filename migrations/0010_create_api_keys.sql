-- Personal API keys for MCP / external integrations (e.g. Claude)
CREATE TABLE IF NOT EXISTS api_keys (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label varchar(100) NOT NULL,
  key_hash varchar(128) NOT NULL UNIQUE,
  key_prefix varchar(16) NOT NULL,
  last_used_at timestamp,
  revoked_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
