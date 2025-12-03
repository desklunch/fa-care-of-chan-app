import { db } from "../server/db";
import { vendorServices } from "../shared/schema";
import * as fs from "fs";
import * as path from "path";

interface CsvVendorService {
  external_id: string;
  name: string;
  description: string;
  icon: string;
}

function parseCSV(content: string): CsvVendorService[] {
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
  const results: CsvVendorService[] = [];

  for (let i = 1; i < records.length; i++) {
    const values = records[i];
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = values[index]?.trim() || "";
    });

    if (obj.name) {
      results.push(obj as CsvVendorService);
    }
  }

  return results;
}

async function importVendorServices() {
  const csvPath = path.join(process.cwd(), "attached_assets", "COC_Vendor_Services_Import_1764788446291.csv");
  console.log("Reading CSV from:", csvPath);
  
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  console.log("CSV content length:", csvContent.length);
  
  const services = parseCSV(csvContent);
  console.log(`Found ${services.length} vendor services to import`);

  let imported = 0;
  for (const service of services) {
    try {
      await db.insert(vendorServices).values({
        externalId: service.external_id,
        name: service.name,
        description: service.description,
        icon: service.icon,
      });
      imported++;
      console.log(`Imported: ${service.name}`);
    } catch (error) {
      console.error(`Error importing ${service.name}:`, error);
    }
  }

  console.log(`\nImport complete! Imported ${imported} of ${services.length} vendor services.`);
  process.exit(0);
}

importVendorServices().catch(console.error);
