import { db } from "../server/db";
import { vendors } from "../shared/schema";
import * as fs from "fs";
import * as path from "path";

interface CsvVendor {
  external_id: string;
  business_name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  capabilities_deck: string;
  employee_count: string;
  diversity_info: string;
  charges_sales_tax: string;
  sales_tax_notes: string;
  is_preferred: string;
  notes: string;
  metro_area: string;
  locations: string;
}

function parseCSV(content: string): CsvVendor[] {
  const lines = content.split("\n");
  const headers = parseCSVLine(lines[0]);
  const results: CsvVendor[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header.trim()] = values[index]?.trim() || "";
    });
    results.push(obj as CsvVendor);
  }

  return results;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

function parseBoolean(value: string): boolean {
  return value.toLowerCase() === "true";
}

function parseJSON(value: string): any {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function importVendors() {
  console.log("Starting vendors import...");

  const csvPath = path.join(
    process.cwd(),
    "attached_assets/COC_Vendors_Import_1764787001962.csv"
  );
  const content = fs.readFileSync(csvPath, "utf-8");
  const csvVendors = parseCSV(content);

  console.log(`Found ${csvVendors.length} vendors to import`);

  let imported = 0;
  let skipped = 0;

  for (const csvVendor of csvVendors) {
    const businessName = csvVendor.business_name?.trim();

    if (!businessName) {
      skipped++;
      continue;
    }

    try {
      await db.insert(vendors).values({
        externalId: csvVendor.external_id?.trim() || null,
        businessName,
        address: csvVendor.address?.trim() || null,
        phone: csvVendor.phone?.trim() || null,
        email: csvVendor.email?.trim() || null,
        website: csvVendor.website?.trim() || null,
        capabilitiesDeck: csvVendor.capabilities_deck?.trim() || null,
        employeeCount: csvVendor.employee_count?.trim() || null,
        diversityInfo: csvVendor.diversity_info?.trim() || null,
        chargesSalesTax: parseBoolean(csvVendor.charges_sales_tax),
        salesTaxNotes: csvVendor.sales_tax_notes?.trim() || null,
        isPreferred: parseBoolean(csvVendor.is_preferred),
        notes: csvVendor.notes?.trim() || null,
        metroArea: parseJSON(csvVendor.metro_area),
        locations: parseJSON(csvVendor.locations),
      });
      imported++;

      if (imported % 50 === 0) {
        console.log(`Imported ${imported} vendors...`);
      }
    } catch (error) {
      console.error(`Error importing vendor ${businessName}:`, error);
      skipped++;
    }
  }

  console.log(`\nImport complete!`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);

  process.exit(0);
}

importVendors().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
