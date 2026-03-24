import { db } from "../server/db";
import { dealStatuses, deals } from "@shared/schema";
import { count, eq, isNull, notInArray } from "drizzle-orm";

async function migrate() {
  console.log("[migrate-deal-statuses] Verifying deal status migration state...");

  const statusRows = await db.select({ id: dealStatuses.id, name: dealStatuses.name }).from(dealStatuses);

  if (statusRows.length === 0) {
    console.error("[migrate-deal-statuses] ERROR: deal_statuses table is empty.");
    console.error("  Run the SQL migration first: psql -f scripts/migrations/001-deal-statuses.sql");
    console.error("  Or start the application to trigger the seed function.");
    process.exit(1);
  }

  console.log(`  Found ${statusRows.length} deal statuses: ${statusRows.map(s => s.name).join(", ")}`);

  const [totalDeals] = await db.select({ cnt: count() }).from(deals);
  const [nullLegacy] = await db
    .select({ cnt: count() })
    .from(deals)
    .where(isNull(deals.statusLegacy));

  const validIds = statusRows.map(s => s.id);
  const [orphaned] = await db
    .select({ cnt: count() })
    .from(deals)
    .where(notInArray(deals.status, validIds));

  console.log(`  Total deals: ${totalDeals?.cnt ?? 0}`);
  console.log(`  Deals missing status_legacy: ${nullLegacy?.cnt ?? 0}`);
  console.log(`  Deals with invalid status FK: ${orphaned?.cnt ?? 0}`);

  if ((nullLegacy?.cnt ?? 0) > 0) {
    console.warn("[migrate-deal-statuses] WARNING: Some deals are missing status_legacy values");
  }

  if ((orphaned?.cnt ?? 0) > 0) {
    const legacyStatus = statusRows.find(s => s.name === "Legacy");
    if (legacyStatus) {
      console.log(`[migrate-deal-statuses] Fixing ${orphaned.cnt} orphaned deals -> Legacy (id=${legacyStatus.id})...`);
      await db
        .update(deals)
        .set({ status: legacyStatus.id })
        .where(notInArray(deals.status, validIds));
      console.log("[migrate-deal-statuses] Orphaned deals fixed");
    } else {
      console.error("[migrate-deal-statuses] ERROR: 'Legacy' status not found, cannot fix orphaned deals");
      process.exit(1);
    }
  }

  console.log("[migrate-deal-statuses] Migration verification complete");
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[migrate-deal-statuses] Error:", err);
    process.exit(1);
  });
