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

async function updateEventSchedules() {
  console.log("Reading CSV file...");
  const content = fs.readFileSync(CSV_FILE, "utf8");
  const rows = parseCSV(content);
  const headers = rows[0];

  const externalIdIdx = headers.indexOf("deal.external_id");
  const eventScheduleIdx = headers.indexOf("deals.event_schedule");

  console.log(`External ID column index: ${externalIdIdx}`);
  console.log(`Event Schedule column index: ${eventScheduleIdx}`);

  let updated = 0;
  let skipped = 0;
  let noSchedule = 0;
  let errors = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const externalIdStr = row[externalIdIdx]?.trim();
    const eventScheduleStr = row[eventScheduleIdx]?.trim();

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

    const eventSchedule = parseJSON(eventScheduleStr);
    if (!eventSchedule || !Array.isArray(eventSchedule) || eventSchedule.length === 0) {
      noSchedule++;
      continue;
    }

    try {
      await db
        .update(deals)
        .set({ eventSchedule })
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
  console.log(`No event schedule data: ${noSchedule}`);
  console.log(`Errors: ${errors}`);
}

updateEventSchedules()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
