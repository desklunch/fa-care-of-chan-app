import { db } from "../server/db";
import { venues } from "../shared/schema";
import { eq, isNotNull } from "drizzle-orm";

interface OldVenueSpace {
  id: string;
  name: string;
  maxCapacity?: number;
  maxCapacitySeated?: number;
  maxCapacityStanding?: number | null;
  minCapacity?: number | null;
  sizeSqft?: number | null;
  format?: "Seated" | "Standing" | null;
  hasSeatedFormat?: boolean | null;
  hasStandingFormat?: boolean | null;
  description?: string | null;
}

interface NewVenueSpace {
  id: string;
  name: string;
  maxCapacitySeated: number;
  maxCapacityStanding: number | null;
  minCapacity: number | null;
  sizeSqft: number | null;
  hasSeatedFormat: boolean | null;
  hasStandingFormat: boolean | null;
  description: string | null;
}

async function main() {
  console.log("Migrating venue spaces v2: maxCapacity→maxCapacitySeated, format→boolean flags...\n");
  
  const venuesWithSpaces = await db
    .select({ id: venues.id, name: venues.name, venueSpaces: venues.venueSpaces })
    .from(venues)
    .where(isNotNull(venues.venueSpaces));
  
  let migrated = 0;
  let skipped = 0;
  
  for (const venue of venuesWithSpaces) {
    const spaces = venue.venueSpaces as OldVenueSpace[] | null;
    if (!spaces || spaces.length === 0) {
      skipped++;
      continue;
    }
    
    const needsMigration = spaces.some((s) => 
      s.maxCapacity !== undefined || 
      s.format !== undefined ||
      s.maxCapacitySeated === undefined
    );
    
    if (!needsMigration) {
      skipped++;
      continue;
    }
    
    const migratedSpaces: NewVenueSpace[] = spaces.map((s) => {
      const wasSeated = s.format === "Seated";
      const wasStanding = s.format === "Standing";
      
      return {
        id: s.id,
        name: s.name,
        maxCapacitySeated: s.maxCapacitySeated ?? s.maxCapacity ?? 0,
        maxCapacityStanding: s.maxCapacityStanding ?? null,
        minCapacity: s.minCapacity ?? null,
        sizeSqft: s.sizeSqft ?? null,
        hasSeatedFormat: s.hasSeatedFormat ?? (wasSeated ? true : null),
        hasStandingFormat: s.hasStandingFormat ?? (wasStanding ? true : null),
        description: s.description ?? null,
      };
    });
    
    await db
      .update(venues)
      .set({ venueSpaces: migratedSpaces })
      .where(eq(venues.id, venue.id));
    
    console.log(`  [OK] ${venue.name}: ${migratedSpaces.length} spaces migrated`);
    migrated++;
  }
  
  console.log("\n--- Summary ---");
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped (no migration needed): ${skipped}`);
  console.log("Done!");
  
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
