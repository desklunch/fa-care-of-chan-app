import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { db } from "../server/db";
import { deals, clients, contacts, clientContacts, users } from "../shared/schema";
import { eq, and } from "drizzle-orm";

interface CSVRow {
  "deal.external_id": string;
  "deals.owner_id": string;
  "deals.status": string;
  "deals.display_name": string;
  "deals.started_on": string;
  "deals.won_on": string;
  "deals.last_contact_on": string;
  "deals.concept": string;
  "contacts.external_id": string;
  "clients.industry": string;
  "deals.services": string;
  "deals.low_value": string;
  "deals.value": string;
  "deals.notes": string;
  "deals.event_schedule": string;
  "deals.locations": string;
  "clients.name": string;
  "clients.external_id": string;
  "contacts.first_name": string;
  "contacts.last_name": string;
  "contacts.title": string;
  "contacts.email": string;
}

interface ImportError {
  row: number;
  externalId: string;
  type: "client" | "contact" | "deal";
  error: string;
}

const importErrors: ImportError[] = [];

function parseCSV(content: string): CSVRow[] {
  const lines = content.split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }

  return rows;
}

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === "") return null;
  
  const cleaned = dateStr.trim();
  
  if (cleaned.includes("/")) {
    const parts = cleaned.split("/");
    if (parts.length === 3) {
      const [month, day, year] = parts;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  
  return cleaned;
}

function parseCurrency(value: string): number | null {
  if (!value || value.trim() === "" || value === "Not disclosed") return null;
  const cleaned = value.replace(/[$,]/g, "").trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

function parseServices(servicesStr: string): string[] {
  if (!servicesStr || servicesStr.trim() === "") return [];
  return servicesStr.split(",").map((s) => s.trim()).filter(Boolean);
}

function parseJSON(jsonStr: string): any {
  if (!jsonStr || jsonStr.trim() === "") return [];
  try {
    return JSON.parse(jsonStr);
  } catch {
    return [];
  }
}

async function importData() {
  console.log("Starting import...\n");

  const csvPath = path.resolve(__dirname, "../attached_assets/CoC_Deals_Data_with_Locations_(2)_1766082509216.csv");
  const content = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCSV(content);

  console.log(`Parsed ${rows.length} rows from CSV\n`);

  const clientMap = new Map<string, string>();
  const contactMap = new Map<string, string>();

  let clientsImported = 0;
  let clientsSkipped = 0;
  let contactsImported = 0;
  let contactsSkipped = 0;
  let dealsImported = 0;
  let dealsSkipped = 0;

  console.log("Phase 1: Importing clients...");
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const clientExternalId = row["clients.external_id"]?.trim();
    const clientName = row["clients.name"]?.trim();

    if (!clientExternalId || !clientName) continue;
    if (clientMap.has(clientExternalId)) continue;

    try {
      const existing = await db.select().from(clients).where(eq(clients.externalId, clientExternalId)).limit(1);
      
      if (existing.length > 0) {
        clientMap.set(clientExternalId, existing[0].id);
        clientsSkipped++;
      } else {
        const [newClient] = await db.insert(clients).values({
          externalId: clientExternalId,
          name: clientName,
          industry: row["clients.industry"]?.trim() || null,
        }).returning();
        
        clientMap.set(clientExternalId, newClient.id);
        clientsImported++;
      }
    } catch (error: any) {
      importErrors.push({
        row: i + 2,
        externalId: clientExternalId,
        type: "client",
        error: error.message,
      });
    }
  }
  console.log(`  Imported: ${clientsImported}, Skipped: ${clientsSkipped}\n`);

  console.log("Phase 2: Importing contacts...");
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const contactExternalId = row["contacts.external_id"]?.trim();
    const firstName = row["contacts.first_name"]?.trim();
    const lastName = row["contacts.last_name"]?.trim();

    if (!contactExternalId || !firstName || !lastName) continue;
    if (contactMap.has(contactExternalId)) continue;

    try {
      const existing = await db.select().from(contacts).where(eq(contacts.externalId, contactExternalId)).limit(1);
      
      if (existing.length > 0) {
        contactMap.set(contactExternalId, existing[0].id);
        contactsSkipped++;
      } else {
        const email = row["contacts.email"]?.trim();
        const [newContact] = await db.insert(contacts).values({
          externalId: contactExternalId,
          firstName,
          lastName,
          jobTitle: row["contacts.title"]?.trim() || null,
          emailAddresses: email ? [email] : [],
        }).returning();
        
        contactMap.set(contactExternalId, newContact.id);
        contactsImported++;

        const clientExternalId = row["clients.external_id"]?.trim();
        if (clientExternalId && clientMap.has(clientExternalId)) {
          const clientId = clientMap.get(clientExternalId)!;
          const existingLink = await db.select().from(clientContacts)
            .where(and(eq(clientContacts.clientId, clientId), eq(clientContacts.contactId, newContact.id)))
            .limit(1);
          
          if (existingLink.length === 0) {
            await db.insert(clientContacts).values({
              clientId,
              contactId: newContact.id,
            });
          }
        }
      }
    } catch (error: any) {
      importErrors.push({
        row: i + 2,
        externalId: contactExternalId,
        type: "contact",
        error: error.message,
      });
    }
  }
  console.log(`  Imported: ${contactsImported}, Skipped: ${contactsSkipped}\n`);

  console.log("Phase 3: Importing deals...");
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const dealExternalId = row["deal.external_id"]?.trim();
    const displayName = row["deals.display_name"]?.trim();
    const clientExternalId = row["clients.external_id"]?.trim();

    if (!dealExternalId || !displayName) {
      importErrors.push({
        row: i + 2,
        externalId: dealExternalId || "UNKNOWN",
        type: "deal",
        error: "Missing deal external_id or display_name",
      });
      continue;
    }

    try {
      const existing = await db.select().from(deals).where(eq(deals.externalId, dealExternalId)).limit(1);
      
      if (existing.length > 0) {
        dealsSkipped++;
        continue;
      }

      const clientId = clientExternalId ? clientMap.get(clientExternalId) : null;
      if (!clientId) {
        importErrors.push({
          row: i + 2,
          externalId: dealExternalId,
          type: "deal",
          error: `Client not found: ${clientExternalId}`,
        });
        continue;
      }

      const ownerId = row["deals.owner_id"]?.trim() || null;
      let validOwnerId: string | null = null;
      if (ownerId) {
        const ownerExists = await db.select().from(users).where(eq(users.id, ownerId)).limit(1);
        if (ownerExists.length > 0) {
          validOwnerId = ownerId;
        }
      }

      const contactExternalId = row["contacts.external_id"]?.trim();
      const primaryContactId = contactExternalId ? contactMap.get(contactExternalId) : null;

      const status = row["deals.status"]?.trim() || "Prospecting";
      const eventSchedule = parseJSON(row["deals.event_schedule"]);
      const locations = parseJSON(row["deals.locations"]);

      await db.insert(deals).values({
        externalId: dealExternalId,
        displayName,
        status,
        clientId,
        ownerId: validOwnerId,
        primaryContactId: primaryContactId || null,
        concept: row["deals.concept"]?.trim() || null,
        notes: row["deals.notes"]?.trim() || null,
        services: parseServices(row["deals.services"]),
        dealValue: parseCurrency(row["deals.value"]),
        lowValue: parseCurrency(row["deals.low_value"]),
        startedOn: parseDate(row["deals.started_on"]),
        wonOn: parseDate(row["deals.won_on"]),
        lastContactOn: parseDate(row["deals.last_contact_on"]),
        eventSchedule,
        locations,
      });

      dealsImported++;
    } catch (error: any) {
      importErrors.push({
        row: i + 2,
        externalId: dealExternalId,
        type: "deal",
        error: error.message,
      });
    }
  }
  console.log(`  Imported: ${dealsImported}, Skipped: ${dealsSkipped}\n`);

  console.log("=== Import Summary ===");
  console.log(`Clients: ${clientsImported} imported, ${clientsSkipped} skipped`);
  console.log(`Contacts: ${contactsImported} imported, ${contactsSkipped} skipped`);
  console.log(`Deals: ${dealsImported} imported, ${dealsSkipped} skipped`);
  console.log(`Errors: ${importErrors.length}`);

  if (importErrors.length > 0) {
    const logPath = path.resolve(__dirname, "../import-errors.log");
    const logContent = importErrors.map((e) => 
      `Row ${e.row} | ${e.type} | ${e.externalId} | ${e.error}`
    ).join("\n");
    fs.writeFileSync(logPath, `Import Errors - ${new Date().toISOString()}\n\n${logContent}`);
    console.log(`\nError log written to: ${logPath}`);
  }

  console.log("\nImport complete!");
  process.exit(0);
}

importData().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
