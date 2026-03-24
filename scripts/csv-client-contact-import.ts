import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { db } from "../server/db";
import { clients, contacts, clientContacts, deals } from "../shared/schema";
import { eq } from "drizzle-orm";

const CSV_PATH = path.resolve(
  __dirname,
  "../attached_assets/coc-deals-26.xlsx_-_new_client_contacts_1774386509003.csv",
);

function parseCSV(raw: string): Record<string, string>[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || "").trim();
    });

    if (!row["deal.id"]) continue;
    rows.push(row);
  }
  return rows;
}

async function main() {
  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(raw);

  console.log(`Parsed ${rows.length} rows from CSV\n`);

  let created = 0;
  let errors = 0;
  let dealNotFound = 0;

  for (const row of rows) {
    const clientName = row["client.name"];
    const firstName = row["contact.firstName"];
    const lastName = row["contact.lastName"];
    const title = row["contact.title"];
    const email = row["contact.email"];
    const dealId = row["deal.id"];

    try {
      const [existingDeal] = await db
        .select({ id: deals.id })
        .from(deals)
        .where(eq(deals.id, dealId));

      if (!existingDeal) {
        console.log(`  DEAL NOT FOUND: ${dealId} (client: ${clientName})`);
        dealNotFound++;
        continue;
      }

      const [newClient] = await db
        .insert(clients)
        .values({ name: clientName })
        .returning({ id: clients.id });

      const contactValues: {
        firstName: string;
        lastName: string;
        jobTitle?: string;
        emailAddresses?: string[];
      } = {
        firstName,
        lastName,
      };
      if (title) contactValues.jobTitle = title;
      if (email) contactValues.emailAddresses = [email];

      const [newContact] = await db
        .insert(contacts)
        .values(contactValues)
        .returning({ id: contacts.id });

      await db.insert(clientContacts).values({
        clientId: newClient.id,
        contactId: newContact.id,
      });

      await db
        .update(deals)
        .set({
          clientId: newClient.id,
          primaryContactId: newContact.id,
        })
        .where(eq(deals.id, dealId));

      console.log(
        `  OK: ${clientName} -> client=${newClient.id}, contact=${newContact.id} -> deal=${dealId}`,
      );
      created++;
    } catch (err: any) {
      console.error(`  ERROR on row (${clientName}): ${err.message}`);
      errors++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total rows:     ${rows.length}`);
  console.log(`Created:        ${created}`);
  console.log(`Deal not found: ${dealNotFound}`);
  console.log(`Errors:         ${errors}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
