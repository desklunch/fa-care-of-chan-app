import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { db } from "../server/db";
import { deals } from "../shared/schema";
import { eq } from "drizzle-orm";

const SERVICE_NAME_TO_ID: Record<string, number> = {
  "Concepting": 19,
  "Consulting": 25,
  "Event Concepting": 19,
  "Executive Production": 20,
  "Gifting": 12,
  "Liquor Cabinet Program": 18,
  "Marketing": 10,
  "Programming": 13,
};

const STATUS_NAME_TO_ID: Record<string, number> = {
  "Closed Lost": 6,
  "Closed Won": 5,
  "Declined by Us": 7,
  "Initial Contact": 2,
  "Negotiation": 4,
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
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const month = match[1].padStart(2, "0");
  const day = match[2].padStart(2, "0");
  const year = match[3];
  return `${year}-${month}-${day}`;
}

interface ParseResult {
  ids: number[] | null;
  warnings: string[];
}

function parseServicesArray(raw: string): ParseResult {
  if (!raw || raw.trim() === "") return { ids: null, warnings: [] };
  const warnings: string[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { ids: null, warnings: [`Invalid services_array format: "${raw}"`] };
    const ids: number[] = [];
    for (const name of parsed) {
      const id = SERVICE_NAME_TO_ID[name];
      if (id !== undefined) {
        if (!ids.includes(id)) ids.push(id);
      } else {
        warnings.push(`Unknown service name: "${name}"`);
      }
    }
    return { ids, warnings };
  } catch {
    return { ids: null, warnings: [`Failed to parse services_array: "${raw}"`] };
  }
}

async function main() {
  const csvPath = path.resolve(__dirname, "../attached_assets/coc-deals-26.xlsx_-_old_deals_import_1774324402054.csv");
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

  let updated = 0;
  let notFound = 0;
  let errors = 0;
  let skipped = 0;
  const notFoundIds: string[] = [];
  const errorDetails: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const id = row[colIndex["id"]];
    if (!id) {
      skipped++;
      continue;
    }

    try {
      const updateData: Record<string, unknown> = {};

      const getVal = (col: string) => {
        const idx = colIndex[col];
        if (idx === undefined) return "";
        return (row[idx] || "").trim();
      };

      const statusLegacy = getVal("status_legacy");
      if (statusLegacy) updateData.statusLegacy = statusLegacy;

      const projectDate = getVal("project_date");
      if (projectDate) updateData.projectDate = projectDate;

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
            updateData[dbCol] = d;
          } else {
            errors++;
            errorDetails.push(`Row ${i + 2} (id=${id}): Failed to parse date for ${csvCol}: "${val}"`);
          }
        }
      }

      const concept = getVal("concept");
      if (concept) updateData.concept = concept;

      const servicesArray = getVal("services_array");
      if (servicesArray) {
        const result = parseServicesArray(servicesArray);
        for (const w of result.warnings) {
          errors++;
          errorDetails.push(`Row ${i + 2} (id=${id}): ${w}`);
        }
        if (result.ids !== null) updateData.serviceIds = result.ids;
      }

      const budgetNotes = getVal("budget_notes");
      if (budgetNotes) updateData.budgetNotes = budgetNotes;

      const locationText = getVal("location_text");
      if (locationText) updateData.locationsText = locationText;

      const nextSteps = getVal("next_steps");
      if (nextSteps) updateData.nextSteps = nextSteps;

      const budgetLow = getVal("budget_low");
      if (budgetLow) {
        const n = parseInt(budgetLow, 10);
        if (!isNaN(n)) updateData.budgetLow = n;
      }

      const budgetHigh = getVal("budget_high");
      if (budgetHigh) {
        const n = parseInt(budgetHigh, 10);
        if (!isNaN(n)) updateData.budgetHigh = n;
      }

      const status = getVal("status");
      if (status) {
        const statusId = STATUS_NAME_TO_ID[status];
        if (statusId !== undefined) {
          updateData.status = statusId;
        } else {
          errors++;
          errorDetails.push(`Row ${i + 2} (id=${id}): Unknown status "${status}"`);
        }
      }

      if (Object.keys(updateData).length === 0) {
        continue;
      }

      const result = await db
        .update(deals)
        .set(updateData)
        .where(eq(deals.id, id))
        .returning({ id: deals.id });

      if (result.length === 0) {
        notFound++;
        notFoundIds.push(id);
      } else {
        updated++;
      }

      if ((i + 1) % 100 === 0) {
        console.log(`  Processed ${i + 1}/${dataRows.length} rows...`);
      }
    } catch (err: unknown) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      errorDetails.push(`Row ${i + 2} (id=${id}): ${msg}`);
    }
  }

  console.log("\n=== Bulk Update Summary ===");
  console.log(`Total rows in CSV: ${dataRows.length}`);
  console.log(`Skipped (no id / junk rows): ${skipped}`);
  console.log(`Successfully updated: ${updated}`);
  console.log(`IDs not found: ${notFound}`);
  if (notFoundIds.length > 0) {
    console.log(`  Not found IDs: ${notFoundIds.join(", ")}`);
  }
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
