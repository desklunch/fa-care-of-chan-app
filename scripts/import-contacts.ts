import { db } from "../server/db";
import { contacts } from "../shared/schema";
import * as fs from "fs";
import * as path from "path";

interface CsvContact {
  leagacy_id: string;
  first_name: string;
  last_name: string;
  title: string;
  email: string;
  phone: string;
  linkedin_username: string;
}

function parseCSV(content: string): CsvContact[] {
  const lines = content.split("\n");
  const headers = parseCSVLine(lines[0]);
  const results: CsvContact[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header.trim()] = values[index]?.trim() || "";
    });
    results.push(obj as CsvContact);
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

async function importContacts() {
  console.log("Starting contacts import...");

  const csvPath = path.join(
    process.cwd(),
    "attached_assets/contacts_1764782403871.csv"
  );
  const content = fs.readFileSync(csvPath, "utf-8");
  const csvContacts = parseCSV(content);

  console.log(`Found ${csvContacts.length} contacts to import`);

  let imported = 0;
  let skipped = 0;

  for (const csvContact of csvContacts) {
    const firstName = csvContact.first_name?.trim();
    const lastName = csvContact.last_name?.trim() || "";

    if (!firstName) {
      skipped++;
      continue;
    }

    const emailAddresses = csvContact.email?.trim()
      ? [csvContact.email.trim()]
      : null;
    const phoneNumbers = csvContact.phone?.trim()
      ? [csvContact.phone.trim()]
      : null;

    try {
      await db.insert(contacts).values({
        externalId: csvContact.leagacy_id?.trim() || null,
        firstName,
        lastName,
        jobTitle: csvContact.title?.trim() || null,
        emailAddresses,
        phoneNumbers,
        linkedinUsername: csvContact.linkedin_username?.trim() || null,
      });
      imported++;

      if (imported % 100 === 0) {
        console.log(`Imported ${imported} contacts...`);
      }
    } catch (error) {
      console.error(
        `Error importing contact ${firstName} ${lastName}:`,
        error
      );
      skipped++;
    }
  }

  console.log(`\nImport complete!`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);

  process.exit(0);
}

importContacts().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
