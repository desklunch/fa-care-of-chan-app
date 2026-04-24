CREATE TABLE IF NOT EXISTS "user_google_credentials" (
  "user_id" varchar PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "encrypted_refresh_token" text,
  "access_token" text,
  "access_token_expiry" timestamp,
  "granted_scopes" text,
  "google_account_email" varchar(255),
  "updated_at" timestamp DEFAULT now() NOT NULL
);
