import { db } from "../server/db";
import { deals } from "../shared/schema";
import { sql, eq } from "drizzle-orm";

interface DealRow {
  id: string;
  externalId: number | null;
  startedOn: string | null;
}

async function updateCreatedAt() {
  console.log("Fetching all deals with external_id and started_on...");

  const allDeals = await db
    .select({
      id: deals.id,
      externalId: deals.externalId,
      startedOn: deals.startedOn,
    })
    .from(deals)
    .orderBy(deals.externalId);

  // Filter deals that have an external_id
  const dealsWithExternalId = allDeals.filter((d) => d.externalId != null) as DealRow[];
  console.log(`Found ${dealsWithExternalId.length} deals with external_id`);

  // Separate deals with and without started_on
  const dealsWithStartedOn = dealsWithExternalId.filter((d) => d.startedOn != null);
  const dealsWithoutStartedOn = dealsWithExternalId.filter((d) => d.startedOn == null);

  console.log(`Deals with started_on: ${dealsWithStartedOn.length}`);
  console.log(`Deals without started_on: ${dealsWithoutStartedOn.length}`);

  // Function to find the nearest deal with started_on
  function findNearestStartedOn(externalId: number): string | null {
    let nearestDeal: DealRow | null = null;
    let minDistance = Infinity;

    for (const deal of dealsWithStartedOn) {
      const distance = Math.abs(deal.externalId! - externalId);
      if (distance < minDistance) {
        minDistance = distance;
        nearestDeal = deal;
      }
    }

    return nearestDeal?.startedOn || null;
  }

  // Update deals with started_on: set created_at = started_on
  console.log("\nUpdating deals with started_on...");
  let updatedWithStartedOn = 0;
  for (const deal of dealsWithStartedOn) {
    const dateValue = new Date(deal.startedOn!);
    await db
      .update(deals)
      .set({ createdAt: dateValue })
      .where(eq(deals.id, deal.id));
    updatedWithStartedOn++;
  }
  console.log(`Updated ${updatedWithStartedOn} deals with their own started_on`);

  // Update deals without started_on: find nearest and use its started_on
  console.log("\nUpdating deals without started_on using nearest neighbor...");
  let updatedWithNearest = 0;
  for (const deal of dealsWithoutStartedOn) {
    const nearestDateStr = findNearestStartedOn(deal.externalId!);
    if (nearestDateStr) {
      const dateValue = new Date(nearestDateStr);
      await db
        .update(deals)
        .set({ createdAt: dateValue })
        .where(eq(deals.id, deal.id));
      updatedWithNearest++;
      console.log(`  Deal external_id=${deal.externalId} -> using nearest started_on: ${nearestDateStr}`);
    } else {
      console.log(`  Deal external_id=${deal.externalId} -> no nearby deal with started_on found`);
    }
  }
  console.log(`Updated ${updatedWithNearest} deals using nearest neighbor`);

  console.log("\n=== Summary ===");
  console.log(`Total deals with external_id: ${dealsWithExternalId.length}`);
  console.log(`Updated with own started_on: ${updatedWithStartedOn}`);
  console.log(`Updated with nearest started_on: ${updatedWithNearest}`);
}

updateCreatedAt()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
