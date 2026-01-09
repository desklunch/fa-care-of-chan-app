import { db } from "../server/db";
import { contacts } from "../shared/schema";
import * as fs from "fs";
import * as path from "path";

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

function parseJsonArray(value: string): string[] | null {
  if (!value || value.trim() === '') return null;
  
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map(v => String(v));
    }
    return null;
  } catch {
    return null;
  }
}

async function importContacts() {
  console.log("Starting contacts import...");

  const csvPath = path.join(
    process.cwd(),
    "attached_assets/vendors_contacts_-_contacts_1767978915034.csv"
  );
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").filter(line => line.trim() !== "");
  
  const header = parseCSVLine(lines[0]);
  console.log("Header:", header);
  
  const dataLines = lines.slice(1);
  console.log(`Found ${dataLines.length} contacts to import`);

  let imported = 0;
  let skipped = 0;

  for (const line of dataLines) {
    const values = parseCSVLine(line);
    
    const externalId = values[0]?.trim() || null;
    const firstName = values[1]?.trim() || "";
    const lastName = values[2]?.trim() || "";
    const phoneNumbers = parseJsonArray(values[3]);
    const emailAddresses = parseJsonArray(values[4]);
    const jobTitle = values[5]?.trim() || null;

    if (!firstName && !lastName) {
      console.log(`Skipping row with no name: ${line.substring(0, 50)}...`);
      skipped++;
      continue;
    }

    try {
      await db.insert(contacts).values({
        externalId,
        firstName: firstName || "",
        lastName: lastName || "",
        phoneNumbers,
        emailAddresses,
        jobTitle,
      });
      imported++;

      if (imported % 50 === 0) {
        console.log(`Imported ${imported} contacts...`);
      }
    } catch (error: any) {
      console.error(
        `Error importing contact ${firstName} ${lastName}:`,
        error.message
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
