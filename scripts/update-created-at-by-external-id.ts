import { db } from "../server/db";
import { deals } from "../shared/schema";
import { eq } from "drizzle-orm";

async function updateCreatedAtByExternalId() {
  console.log("Fetching all deals with external_id...");

  const allDeals = await db
    .select({
      id: deals.id,
      externalId: deals.externalId,
    })
    .from(deals);

  // Filter deals that have an external_id and sort by external_id ascending
  const dealsWithExternalId = allDeals
    .filter((d) => d.externalId != null)
    .sort((a, b) => a.externalId! - b.externalId!);

  console.log(`Found ${dealsWithExternalId.length} deals with external_id`);

  if (dealsWithExternalId.length === 0) {
    console.log("No deals to update.");
    return;
  }

  // Get the range of external_ids
  const minExternalId = dealsWithExternalId[0].externalId!;
  const maxExternalId = dealsWithExternalId[dealsWithExternalId.length - 1].externalId!;
  console.log(`External ID range: ${minExternalId} to ${maxExternalId}`);

  // Define date range: newest (external_id=1) to oldest (external_id=479)
  // Use today as the newest date and go back ~2 years for the oldest
  const newestDate = new Date();
  newestDate.setHours(12, 0, 0, 0); // Normalize to noon
  
  const oldestDate = new Date();
  oldestDate.setFullYear(oldestDate.getFullYear() - 2);
  oldestDate.setHours(12, 0, 0, 0);

  const dateRangeMs = newestDate.getTime() - oldestDate.getTime();
  const externalIdRange = maxExternalId - minExternalId;

  console.log(`Date range: ${oldestDate.toISOString().split('T')[0]} to ${newestDate.toISOString().split('T')[0]}`);
  console.log(`\nUpdating created_at for ${dealsWithExternalId.length} deals...`);

  let updated = 0;
  for (const deal of dealsWithExternalId) {
    // Calculate position: external_id=1 should be newest (position 1.0), external_id=479 should be oldest (position 0.0)
    // Invert the ratio: lower external_id = higher position = more recent date
    const position = 1 - ((deal.externalId! - minExternalId) / externalIdRange);
    
    // Calculate the date based on position
    const dateMs = oldestDate.getTime() + (position * dateRangeMs);
    const createdAtDate = new Date(dateMs);

    await db
      .update(deals)
      .set({ createdAt: createdAtDate })
      .where(eq(deals.id, deal.id));

    updated++;
    
    // Log progress every 50 records
    if (updated % 50 === 0 || deal.externalId === minExternalId || deal.externalId === maxExternalId) {
      console.log(`  external_id=${deal.externalId} -> created_at=${createdAtDate.toISOString().split('T')[0]}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated ${updated} deals`);
  console.log(`external_id=${minExternalId} (newest) -> ${newestDate.toISOString().split('T')[0]}`);
  console.log(`external_id=${maxExternalId} (oldest) -> ${oldestDate.toISOString().split('T')[0]}`);
}

updateCreatedAtByExternalId()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
