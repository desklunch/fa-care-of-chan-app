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
  locations: string;
}

function parseCSV(content: string): CsvVendor[] {
  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRecord.push(currentField);
      currentField = "";
    } else if ((char === "\n" || (char === "\r" && nextChar === "\n")) && !inQuotes) {
      if (char === "\r") i++;
      currentRecord.push(currentField);
      if (currentRecord.length > 1 || currentRecord[0] !== "") {
        records.push(currentRecord);
      }
      currentRecord = [];
      currentField = "";
    } else if (char !== "\r") {
      currentField += char;
    }
  }

  if (currentField || currentRecord.length > 0) {
    currentRecord.push(currentField);
    if (currentRecord.length > 1 || currentRecord[0] !== "") {
      records.push(currentRecord);
    }
  }

  if (records.length === 0) return [];

  const headers = records[0].map((h) => h.trim());
  const results: CsvVendor[] = [];

  for (let i = 1; i < records.length; i++) {
    const values = records[i];
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = values[index]?.trim() || "";
    });

    if (obj.business_name && !obj.business_name.includes("region:")) {
      results.push(obj as CsvVendor);
    }
  }

  return results;
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

  console.log(`Found ${csvVendors.length} valid vendors to import`);

  let imported = 0;
  let skipped = 0;

  for (const csvVendor of csvVendors) {
    const businessName = csvVendor.business_name?.trim();

    if (!businessName) {
      console.log("Skipping: empty business name");
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
