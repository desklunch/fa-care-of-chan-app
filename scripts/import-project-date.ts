import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { db } from "../server/db";
import { deals } from "@shared/schema";
import { eq } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const char = content[i];

    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === "\n" || (char === "\r" && content[i + 1] === "\n")) && !inQuotes) {
      currentRow.push(currentField.trim());
      if (currentRow.some(f => f !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
      if (char === "\r") i++;
    } else if (char !== "\r") {
      currentField += char;
    }
    i++;
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f !== "")) {
      rows.push(currentRow);
    }
  }

  return rows;
}

async function main() {
  console.log("Starting project_date import...");

  const csvPath = path.resolve(
    __dirname,
    "../attached_assets/coc-deals-data-import_-_project_date_1766440057317.csv"
  );

  if (!fs.existsSync(csvPath)) {
    console.error("CSV file not found:", csvPath);
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCSV(content);

  console.log(`Parsed ${rows.length} rows from CSV`);

  const headers = rows[0];
  const dataRows = rows.slice(1);

  console.log("Headers:", headers);

  const externalIdIndex = headers.indexOf("external_id");
  const projectDateIndex = headers.indexOf("project_date");

  if (externalIdIndex === -1 || projectDateIndex === -1) {
    console.error("Missing required columns. Found:", headers);
    process.exit(1);
  }

  let updated = 0;
  let notFound = 0;
  let skipped = 0;

  for (const row of dataRows) {
    const externalId = row[externalIdIndex];
    const projectDate = row[projectDateIndex];

    if (!externalId) {
      skipped++;
      continue;
    }

    // Find deal by external_id
    const [existingDeal] = await db
      .select({ id: deals.id })
      .from(deals)
      .where(eq(deals.externalId, externalId))
      .limit(1);

    if (!existingDeal) {
      notFound++;
      console.log(`Deal not found for external_id: ${externalId}`);
      continue;
    }

    // Update projectDate
    await db
      .update(deals)
      .set({ projectDate: projectDate || null, updatedAt: new Date() })
      .where(eq(deals.id, existingDeal.id));

    updated++;
  }

  console.log("\n=== Import Complete ===");
  console.log(`Updated: ${updated}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Skipped: ${skipped}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
