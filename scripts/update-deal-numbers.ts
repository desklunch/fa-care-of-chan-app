import { db } from "../server/db";
import { deals } from "../shared/schema";
import { eq } from "drizzle-orm";

async function updateDealNumbers() {
  console.log("Fetching all deals with external_id...");

  const allDeals = await db
    .select({
      id: deals.id,
      externalId: deals.externalId,
      dealNumber: deals.dealNumber,
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

  const maxDealNumber = dealsWithExternalId.length;
  console.log(`Deal numbers will range from 1 to ${maxDealNumber}`);
  console.log(`external_id=1 -> deal_number=${maxDealNumber}`);
  console.log(`external_id=${dealsWithExternalId.length} -> deal_number=1`);

  console.log(`\nUpdating deal_number for ${dealsWithExternalId.length} deals...`);

  let updated = 0;
  for (const deal of dealsWithExternalId) {
    // Reverse the deal number: external_id=1 gets highest, external_id=479 gets 1
    const newDealNumber = maxDealNumber - deal.externalId! + 1;

    await db
      .update(deals)
      .set({ dealNumber: newDealNumber })
      .where(eq(deals.id, deal.id));

    updated++;

    // Log progress every 50 records
    if (updated % 50 === 0 || deal.externalId === 1 || deal.externalId === maxDealNumber) {
      console.log(`  external_id=${deal.externalId} -> deal_number=${newDealNumber}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated ${updated} deals`);
}

updateDealNumbers()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
