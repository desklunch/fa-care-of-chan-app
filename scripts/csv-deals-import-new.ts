import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { db } from "../server/db";
import { deals } from "../shared/schema";

const SERVICE_NAME_TO_ID: Record<string, number> = {
  "Concepting": 19,
  "Consulting": 25,
  "Creative Direction": 15,
  "Culinary Programming": 24,
  "Event Concepting": 19,
  "Executive Production": 20,
  "Gifting": 12,
  "Liquor Cabinet Program": 18,
  "Marketing": 10,
  "Production": 17,
  "Programming": 13,
  "RSVP Management": 9,
};

const STATUS_NAME_TO_ID: Record<string, number> = {
  "Closed Lost": 6,
  "Closed Won": 5,
  "Declined by Us": 7,
  "Initial Contact": 2,
  "Negotiation": 4,
  "Prospecting": 1,
  "Qualified Lead": 3,
};

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
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
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

function parseDateMDY(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === "") return null;
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;
  const month = match[1].padStart(2, "0");
  const day = match[2].padStart(2, "0");
  let year = match[3];
  if (year.length === 2) {
    year = `20${year}`;
  }
  return `${year}-${month}-${day}`;
}

interface ParseResult {
  ids: number[];
  warnings: string[];
}

function parseServicesCommaList(raw: string): ParseResult {
  if (!raw || raw.trim() === "") return { ids: [], warnings: [] };
  const warnings: string[] = [];
  const names = raw.split(",").map(s => s.trim()).filter(Boolean);
  const ids: number[] = [];
  for (const name of names) {
    const id = SERVICE_NAME_TO_ID[name];
    if (id !== undefined) {
      if (!ids.includes(id)) ids.push(id);
    } else {
      warnings.push(`Unknown service name: "${name}"`);
    }
  }
  return { ids, warnings };
}

async function main() {
  const csvPath = path.resolve(__dirname, "../attached_assets/coc-deals-26.xlsx_-_new_deals_import_1774326347052.csv");
  const content = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCSV(content);

  if (rows.length < 2) {
    console.error("CSV has no data rows");
    process.exit(1);
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  console.log(`CSV headers: ${headers.join(", ")}`);
  console.log(`Total data rows: ${dataRows.length}`);

  const colIndex: Record<string, number> = {};
  headers.forEach((h, i) => { colIndex[h] = i; });

  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const getVal = (col: string) => {
      const idx = colIndex[col];
      if (idx === undefined) return "";
      return (row[idx] || "").trim();
    };

    const displayName = getVal("display_name");
    const clientId = getVal("client_id");

    if (!displayName || !clientId) {
      skipped++;
      continue;
    }

    try {
      const insertData: Record<string, unknown> = {
        displayName,
        clientId,
      };

      const statusLegacy = getVal("status_legacy");
      if (statusLegacy) insertData.statusLegacy = statusLegacy;

      const projectDate = getVal("project_date");
      if (projectDate) insertData.projectDate = projectDate;

      const dateFields: Array<[string, string]> = [
        ["started_on", "startedOn"],
        ["won_on", "wonOn"],
        ["last_contact_on", "lastContactOn"],
        ["proposal_sent_on", "proposalSentOn"],
      ];
      for (const [csvCol, dbCol] of dateFields) {
        const val = getVal(csvCol);
        if (val) {
          const d = parseDateMDY(val);
          if (d) {
            insertData[dbCol] = d;
          } else {
            errors++;
            errorDetails.push(`Row ${i + 2} (${displayName}): Failed to parse date for ${csvCol}: "${val}"`);
          }
        }
      }

      const concept = getVal("concept");
      if (concept) insertData.concept = concept;

      const notes = getVal("notes");
      if (notes) insertData.notes = notes;

      const services = getVal("services");
      if (services) {
        const result = parseServicesCommaList(services);
        for (const w of result.warnings) {
          errors++;
          errorDetails.push(`Row ${i + 2} (${displayName}): ${w}`);
        }
        if (result.ids.length > 0) insertData.serviceIds = result.ids;
      }

      const budgetNotes = getVal("budget_notes");
      if (budgetNotes) insertData.budgetNotes = budgetNotes;

      const locationText = getVal("location_text");
      if (locationText) insertData.locationsText = locationText;

      const nextSteps = getVal("next_steps");
      if (nextSteps) insertData.nextSteps = nextSteps;

      const budgetLow = getVal("budget_low");
      if (budgetLow) {
        const n = parseInt(budgetLow, 10);
        if (!isNaN(n)) insertData.budgetLow = n;
      }

      const budgetHigh = getVal("budget_high");
      if (budgetHigh) {
        const n = parseInt(budgetHigh, 10);
        if (!isNaN(n)) insertData.budgetHigh = n;
      }

      const status = getVal("status");
      if (status) {
        const statusId = STATUS_NAME_TO_ID[status];
        if (statusId !== undefined) {
          insertData.status = statusId;
        } else {
          errors++;
          errorDetails.push(`Row ${i + 2} (${displayName}): Unknown status "${status}"`);
          insertData.status = 1;
        }
      } else {
        insertData.status = 1;
      }

      await db.insert(deals).values(insertData as typeof deals.$inferInsert);
      inserted++;

      if ((i + 1) % 25 === 0) {
        console.log(`  Processed ${i + 1}/${dataRows.length} rows...`);
      }
    } catch (err: unknown) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      errorDetails.push(`Row ${i + 2} (${displayName}): ${msg}`);
    }
  }

  console.log("\n=== Import Summary ===");
  console.log(`Total rows in CSV: ${dataRows.length}`);
  console.log(`Skipped (missing display_name or client_id): ${skipped}`);
  console.log(`Successfully inserted: ${inserted}`);
  console.log(`Errors: ${errors}`);
  if (errorDetails.length > 0) {
    console.log("Error details:");
    errorDetails.forEach(e => console.log(`  ${e}`));
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
