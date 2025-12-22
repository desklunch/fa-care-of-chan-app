import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { db } from "../server/db";
import { clients, contacts, users } from "../shared/schema";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
    i++;
  }
  result.push(current.trim());
  return result;
}

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === "") return null;

  const trimmed = dateStr.trim();

  // Handle YYYY-MM-DD format (new format)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return trimmed;
  }

  // Handle MM/DD/YYYY format
  const fullDateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fullDateMatch) {
    const [, month, day, year] = fullDateMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

function parseJSON(jsonStr: string): any {
  if (!jsonStr || jsonStr.trim() === "") return [];

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    return { error: "Failed to parse JSON", raw: jsonStr.substring(0, 100) };
  }
}

async function main() {
  console.log("=== DEALS IMPORT TEST RUN (DRY RUN) ===\n");

  const csvPath = path.resolve(
    __dirname,
    "../attached_assets/COC_Deals_Data_Import_Dec_22_2025_(1)_1766429069851.csv"
  );
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n");

  const headers = parseCSVLine(lines[0]);
  console.log("CSV Headers:", headers.join(", "));
  console.log("");

  // Get validation sets from database
  const existingClients = await db.select({ id: clients.id, name: clients.name }).from(clients);
  const clientIdSet = new Set(existingClients.map((c) => c.id));
  console.log(`Found ${existingClients.length} clients in database`);

  const existingUsers = await db.select({ id: users.id }).from(users);
  const userIdSet = new Set(existingUsers.map((u) => u.id));
  console.log(`Found ${existingUsers.length} users in database`);

  const existingContacts = await db.select({ id: contacts.id }).from(contacts);
  const contactIdSet = new Set(existingContacts.map((c) => c.id));
  console.log(`Found ${existingContacts.length} contacts in database`);

  // Select 10 random rows (excluding header)
  const dataLines = lines.slice(1).filter(line => line.trim() !== "");
  const totalRows = dataLines.length;
  console.log(`\nTotal data rows in CSV: ${totalRows}`);
  
  // Pick 10 random indices
  const randomIndices: number[] = [];
  while (randomIndices.length < 10 && randomIndices.length < totalRows) {
    const idx = Math.floor(Math.random() * totalRows);
    if (!randomIndices.includes(idx)) {
      randomIndices.push(idx);
    }
  }
  randomIndices.sort((a, b) => a - b);

  console.log(`\nTesting ${randomIndices.length} random rows: ${randomIndices.map(i => i + 2).join(", ")} (1-indexed with header)\n`);
  console.log("=".repeat(80));

  for (const idx of randomIndices) {
    const line = dataLines[idx];
    const values = parseCSVLine(line);

    const data: Record<string, string> = {};
    headers.forEach((header, index) => {
      data[header] = values[index] || "";
    });

    const externalId = data["external_id"];
    const displayName = data["display_name"];
    const rowNum = idx + 2; // Account for header and 0-indexing

    console.log(`\n--- Row ${rowNum}: ${displayName} (external_id: ${externalId}) ---`);

    const issues: string[] = [];

    // Validate client_id
    const clientId = data["client_id"]?.trim();
    if (!clientId) {
      issues.push("⚠️ client_id is empty");
    } else if (!clientIdSet.has(clientId)) {
      issues.push(`⚠️ client_id "${clientId}" not found in database`);
    } else {
      console.log(`✓ client_id: ${clientId} (valid)`);
    }

    // Validate owner_id
    const ownerId = data["owner_id"]?.trim();
    if (!ownerId) {
      console.log(`  owner_id: (empty)`);
    } else if (!userIdSet.has(ownerId)) {
      issues.push(`⚠️ owner_id "${ownerId}" not found in users table`);
    } else {
      console.log(`✓ owner_id: ${ownerId} (valid)`);
    }

    // Validate primary_contact_id
    const primaryContactId = data["primary_contact_id"]?.trim();
    if (!primaryContactId) {
      console.log(`  primary_contact_id: (empty)`);
    } else if (!contactIdSet.has(primaryContactId)) {
      issues.push(`⚠️ primary_contact_id "${primaryContactId}" not found in contacts table`);
    } else {
      console.log(`✓ primary_contact_id: ${primaryContactId} (valid)`);
    }

    // Parse and validate dates
    const startedOn = parseDate(data["started_on"]);
    const lastContactOn = parseDate(data["last_contact"]);
    const wonOn = parseDate(data["won_on"]);
    const proposalSentOn = parseDate(data["proposal_sent_on"]);

    console.log(`  started_on: "${data["started_on"]}" → ${startedOn || "(null)"}`);
    console.log(`  last_contact: "${data["last_contact"]}" → ${lastContactOn || "(null)"}`);
    console.log(`  won_on: "${data["won_on"]}" → ${wonOn || "(null)"}`);
    console.log(`  proposal_sent_on: "${data["proposal_sent_on"]}" → ${proposalSentOn || "(null)"}`);

    // Parse services
    const services = parseJSON(data["services"]);
    if (services.error) {
      issues.push(`⚠️ services JSON parse error: ${services.error}`);
    } else {
      console.log(`✓ services: ${JSON.stringify(services)}`);
    }

    // Parse locations
    const locations = parseJSON(data["locations"]);
    if (locations.error) {
      issues.push(`⚠️ locations JSON parse error: ${locations.error}`);
    } else {
      const locDisplay = Array.isArray(locations) && locations.length > 0 
        ? locations.map((l: any) => l.displayName || "Unknown").join(", ")
        : "(empty)";
      console.log(`✓ locations: ${locDisplay}`);
    }

    // Other fields
    console.log(`  status: ${data["status"] || "(empty)"}`);
    console.log(`  project_date: ${data["project_date"] || "(empty)"}`);
    console.log(`  concept: ${(data["concept"] || "").substring(0, 80)}${(data["concept"] || "").length > 80 ? "..." : ""}`);
    console.log(`  budget_notes: ${data["budget_notes"] || "(empty)"}`);

    // Show issues
    if (issues.length > 0) {
      console.log("\n  ISSUES:");
      issues.forEach(issue => console.log(`    ${issue}`));
    } else {
      console.log("\n  ✓ No issues - ready for import");
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n=== DRY RUN COMPLETE ===");
  console.log("No data was inserted into the database.");
  console.log(`\nReady to import ${totalRows} deals when you approve.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
