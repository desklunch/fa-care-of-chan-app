import { db } from "../server/db";
import { vendors, contacts, vendorsContacts } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importVendorsContacts() {
  console.log("Starting vendors-contacts import...");
  
  const csvPath = path.join(__dirname, "../attached_assets/Vendors_Contacts_1764790482501.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.trim().split("\n");
  
  const header = lines[0].split(",");
  console.log("CSV header:", header);
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const [vendorExternalId, contactExternalId] = line.split(",");
    
    try {
      const [vendor] = await db
        .select()
        .from(vendors)
        .where(eq(vendors.externalId, vendorExternalId));
      
      if (!vendor) {
        console.log(`Skipping: vendor with external_id ${vendorExternalId} not found`);
        skipCount++;
        continue;
      }
      
      const [contact] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.externalId, contactExternalId));
      
      if (!contact) {
        console.log(`Skipping: contact with external_id ${contactExternalId} not found`);
        skipCount++;
        continue;
      }
      
      await db
        .insert(vendorsContacts)
        .values({
          vendorId: vendor.id,
          contactId: contact.id,
        });
      
      successCount++;
      console.log(`Linked vendor ${vendor.businessName} to contact ${contact.firstName} ${contact.lastName}`);
    } catch (error: any) {
      if (error.message?.includes("duplicate key")) {
        console.log(`Duplicate: vendor ${vendorExternalId} already linked to contact ${contactExternalId}`);
        skipCount++;
      } else {
        console.error(`Error processing line ${i}:`, error.message);
        errorCount++;
      }
    }
  }
  
  console.log("\n--- Import Summary ---");
  console.log(`Success: ${successCount}`);
  console.log(`Skipped: ${skipCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log("Import completed!");
  
  process.exit(0);
}

importVendorsContacts().catch(console.error);
