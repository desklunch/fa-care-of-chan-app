import { db } from "../server/db";
import { venues } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

interface VenueSpace {
  id: string;
  name: string;
  maxCapacity: number;
  minCapacity: number | null;
  sizeSqft: number | null;
  format: "Seated" | "Standing" | null;
  description: string | null;
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function parseVenueSpaces(spacesArray: string): VenueSpace[] {
  const spaces: VenueSpace[] = [];
  
  const regex = /(\d+)\s*\(([^)]+)\)/g;
  let match;
  
  while ((match = regex.exec(spacesArray)) !== null) {
    const capacity = parseInt(match[1], 10);
    const rawName = match[2].trim();
    const name = toTitleCase(rawName);
    
    spaces.push({
      id: randomUUID(),
      name,
      maxCapacity: capacity,
      minCapacity: null,
      sizeSqft: null,
      format: null,
      description: null,
    });
  }
  
  return spaces;
}

function parseCSV(content: string): Array<{ external_id: string; venue_spaces_array: string }> {
  const lines = content.trim().split("\n");
  const rows: Array<{ external_id: string; venue_spaces_array: string }> = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const firstCommaIndex = line.indexOf(",");
    if (firstCommaIndex === -1) continue;
    
    const external_id = line.substring(0, firstCommaIndex).trim();
    let venue_spaces_array = line.substring(firstCommaIndex + 1).trim();
    
    if (venue_spaces_array.startsWith('"') && venue_spaces_array.endsWith('"')) {
      venue_spaces_array = venue_spaces_array.slice(1, -1);
    }
    
    rows.push({ external_id, venue_spaces_array });
  }
  
  return rows;
}

async function main() {
  console.log("Starting venue spaces import...\n");
  
  const csvPath = path.join(process.cwd(), "attached_assets/event_spaces_1765930461597.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCSV(csvContent);
  
  console.log(`Found ${rows.length} rows in CSV\n`);
  
  let updated = 0;
  let skipped = 0;
  let notFound = 0;
  
  for (const row of rows) {
    const existingVenues = await db
      .select({ id: venues.id, name: venues.name })
      .from(venues)
      .where(eq(venues.externalId, row.external_id));
    
    if (existingVenues.length === 0) {
      console.log(`  [SKIP] external_id not found: ${row.external_id}`);
      notFound++;
      continue;
    }
    
    const venue = existingVenues[0];
    const spaces = parseVenueSpaces(row.venue_spaces_array);
    
    if (spaces.length === 0) {
      console.log(`  [SKIP] No valid spaces parsed for: ${venue.name}`);
      skipped++;
      continue;
    }
    
    await db
      .update(venues)
      .set({ venueSpaces: spaces })
      .where(eq(venues.id, venue.id));
    
    console.log(`  [OK] ${venue.name}: ${spaces.map(s => `${s.name} (${s.maxCapacity})`).join(", ")}`);
    updated++;
  }
  
  console.log("\n--- Summary ---");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no spaces): ${skipped}`);
  console.log(`Not found: ${notFound}`);
  console.log("Done!");
  
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
