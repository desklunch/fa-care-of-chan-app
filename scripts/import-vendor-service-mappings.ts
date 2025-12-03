import { db } from "../server/db";
import { vendors, vendorServices, vendorServicesVendors } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

interface CsvMapping {
  vendor_external_id: string;
  service_external_id: string;
}

function parseCSV(content: string): CsvMapping[] {
  const lines = content.trim().split("\n");
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const results: CsvMapping[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = values[index]?.trim() || "";
    });
    if (obj.vendor_external_id && obj.service_external_id) {
      results.push(obj as CsvMapping);
    }
  }

  return results;
}

async function importMappings() {
  const csvPath = path.join(process.cwd(), "attached_assets", "vendor_services_mapping_1764788731397.csv");
  console.log("Reading CSV from:", csvPath);

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const mappings = parseCSV(csvContent);
  console.log(`Found ${mappings.length} mappings to import`);

  const allVendors = await db.select().from(vendors);
  const allServices = await db.select().from(vendorServices);

  const vendorByExternalId = new Map<string, string>();
  for (const vendor of allVendors) {
    if (vendor.externalId) {
      vendorByExternalId.set(vendor.externalId, vendor.id);
    }
  }

  const serviceByExternalId = new Map<string, string>();
  for (const service of allServices) {
    if (service.externalId) {
      serviceByExternalId.set(service.externalId, service.id);
    }
  }

  console.log(`Loaded ${vendorByExternalId.size} vendors and ${serviceByExternalId.size} services`);

  let imported = 0;
  let skipped = 0;

  for (const mapping of mappings) {
    const vendorId = vendorByExternalId.get(mapping.vendor_external_id);
    const serviceId = serviceByExternalId.get(mapping.service_external_id);

    if (!vendorId) {
      console.log(`Skipping: vendor external_id ${mapping.vendor_external_id} not found`);
      skipped++;
      continue;
    }

    if (!serviceId) {
      console.log(`Skipping: service external_id ${mapping.service_external_id} not found`);
      skipped++;
      continue;
    }

    try {
      await db.insert(vendorServicesVendors).values({
        vendorId,
        vendorServiceId: serviceId,
      });
      imported++;
    } catch (error) {
      console.error(`Error importing mapping ${mapping.vendor_external_id} -> ${mapping.service_external_id}:`, error);
      skipped++;
    }
  }

  console.log(`\nImport complete! Imported ${imported} mappings, skipped ${skipped}`);
  process.exit(0);
}

importMappings().catch(console.error);
