import { db } from "../server/db";
import { deals } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";

const CSV_FILE = "attached_assets/CoC_Deals_Data_with_Locations_(2)_1766082509216.csv";

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
    } else if (char === "\n" && !inQuotes) {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
    } else if (char !== "\r") {
      currentField += char;
    }
  }
  if (currentField || currentRow.length) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  return rows;
}

function parseJSON(jsonStr: string): any {
  if (!jsonStr || jsonStr.trim() === "") return null;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

async function updateLocations() {
  console.log("Reading CSV file...");
  const content = fs.readFileSync(CSV_FILE, "utf8");
  const rows = parseCSV(content);
  const headers = rows[0];

  const externalIdIdx = headers.indexOf("deal.external_id");
  const locationsIdx = headers.indexOf("deals.locations");

  console.log(`External ID column index: ${externalIdIdx}`);
  console.log(`Locations column index: ${locationsIdx}`);

  let updated = 0;
  let skipped = 0;
  let noLocation = 0;
  let errors = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const externalIdStr = row[externalIdIdx]?.trim();
    const locationsStr = row[locationsIdx]?.trim();

    if (!externalIdStr) {
      skipped++;
      continue;
    }

    // Parse external_id as integer
    const externalId = parseInt(externalIdStr, 10);
    if (isNaN(externalId)) {
      skipped++;
      continue;
    }

    const locations = parseJSON(locationsStr);
    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      noLocation++;
      continue;
    }

    try {
      const result = await db
        .update(deals)
        .set({ locations })
        .where(eq(deals.externalId, externalId));

      updated++;
    } catch (err) {
      console.error(`Error updating ${externalId}:`, err);
      errors++;
    }
  }

  console.log("\n=== Update Complete ===");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no external ID): ${skipped}`);
  console.log(`No location data: ${noLocation}`);
  console.log(`Errors: ${errors}`);
}

updateLocations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
