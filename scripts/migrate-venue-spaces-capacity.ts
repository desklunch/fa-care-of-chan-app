import { db } from "../server/db";
import { venues } from "../shared/schema";
import { eq, isNotNull } from "drizzle-orm";

interface OldVenueSpace {
  id: string;
  name: string;
  capacity?: number;
  maxCapacity?: number;
  minCapacity?: number | null;
  sizeSqft?: number | null;
  format?: "Seated" | "Standing" | null;
  description?: string | null;
}

interface NewVenueSpace {
  id: string;
  name: string;
  maxCapacity: number;
  minCapacity: number | null;
  sizeSqft: number | null;
  format: "Seated" | "Standing" | null;
  description: string | null;
}

async function main() {
  console.log("Migrating venue spaces: renaming 'capacity' to 'maxCapacity'...\n");
  
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
    
    const needsMigration = spaces.some((s) => s.capacity !== undefined && s.maxCapacity === undefined);
    if (!needsMigration) {
      skipped++;
      continue;
    }
    
    const migratedSpaces: NewVenueSpace[] = spaces.map((s) => ({
      id: s.id,
      name: s.name,
      maxCapacity: s.maxCapacity ?? s.capacity ?? 0,
      minCapacity: s.minCapacity ?? null,
      sizeSqft: s.sizeSqft ?? null,
      format: s.format ?? null,
      description: s.description ?? null,
    }));
    
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
