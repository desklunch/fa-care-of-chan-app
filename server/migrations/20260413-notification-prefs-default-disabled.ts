import { db } from "../db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Updating notification_preferences defaults to disabled...");

  await db.execute(sql`
    ALTER TABLE notification_preferences
      ALTER COLUMN email_enabled SET DEFAULT false,
      ALTER COLUMN push_enabled SET DEFAULT false,
      ALTER COLUMN in_app_enabled SET DEFAULT false
  `);

  await db.execute(sql`
    UPDATE notification_preferences
    SET email_enabled = false, push_enabled = false, in_app_enabled = false
  `);

  console.log("Creating notification_type_preferences table...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notification_type_preferences (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id),
      notification_type VARCHAR(100) NOT NULL,
      in_app_enabled BOOLEAN NOT NULL DEFAULT false,
      email_enabled BOOLEAN NOT NULL DEFAULT false,
      push_enabled BOOLEAN NOT NULL DEFAULT false,
      CONSTRAINT uq_notification_type_prefs_user_type UNIQUE (user_id, notification_type)
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_notification_type_prefs_user
    ON notification_type_preferences (user_id)
  `);

  console.log("Migration complete.");
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
