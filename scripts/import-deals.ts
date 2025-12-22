import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { db } from "../server/db";
import { deals, clients, contacts, users } from "../shared/schema";
import { eq } from "drizzle-orm";

interface ImportLog {
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  issues: Array<{
    row: number;
    externalId: string;
    displayName: string;
    issue: string;
  }>;
}

const log: ImportLog = {
  totalRows: 0,
  successfulImports: 0,
  failedImports: 0,
  issues: [],
};

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

  // Handle date ranges - take the first date
  if (trimmed.includes("-") && trimmed.includes("/")) {
    const parts = trimmed.split("-");
    if (parts.length >= 1) {
      return parseDate(parts[0].trim());
    }
  }

  // Handle MM/DD/YYYY format
  const fullDateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fullDateMatch) {
    const [, month, day, year] = fullDateMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Handle MM/YYYY format - use first of month
  const monthYearMatch = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (monthYearMatch) {
    const [, month, year] = monthYearMatch;
    return `${year}-${month.padStart(2, "0")}-01`;
  }

  // Handle YYYY format - use first of year
  const yearMatch = trimmed.match(/^(\d{4})$/);
  if (yearMatch) {
    return `${yearMatch[1]}-01-01`;
  }

  // Handle "MM/DD/YYYY, YYYY" format (e.g., "02/14/2026, 2026")
  if (trimmed.includes(",")) {
    const firstPart = trimmed.split(",")[0].trim();
    return parseDate(firstPart);
  }

  return null;
}

function parseJSON(jsonStr: string): any {
  if (!jsonStr || jsonStr.trim() === "") return [];

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse JSON:", jsonStr.substring(0, 100));
    return [];
  }
}

function parseServices(servicesStr: string): string[] {
  if (!servicesStr || servicesStr.trim() === "") return [];

  return servicesStr
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function main() {
  console.log("Starting deals import...");

  const csvPath = path.resolve(
    __dirname,
    "../attached_assets/Coco_Datat_TF_1_Deals_1766369712874.csv"
  );
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n");

  const headers = parseCSVLine(lines[0]);
  console.log("Headers:", headers);

  const unassignedClient = await db
    .select()
    .from(clients)
    .where(eq(clients.name, "#Unassigned"))
    .limit(1);

  if (unassignedClient.length === 0) {
    console.error("#Unassigned client not found!");
    process.exit(1);
  }

  const unassignedClientId = unassignedClient[0].id;
  console.log("Using #Unassigned client ID:", unassignedClientId);

  const existingClients = await db.select({ id: clients.id }).from(clients);
  const clientIdSet = new Set(existingClients.map((c) => c.id));

  const existingUsers = await db.select({ id: users.id }).from(users);
  const userIdSet = new Set(existingUsers.map((u) => u.id));

  const existingContacts = await db.select({ id: contacts.id }).from(contacts);
  const contactIdSet = new Set(existingContacts.map((c) => c.id));

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    log.totalRows++;
    const values = parseCSVLine(line);

    const data: Record<string, string> = {};
    headers.forEach((header, index) => {
      data[header] = values[index] || "";
    });

    const externalId = data["external_id"];
    const displayName = data["display_name"];

    try {
      let clientId = data["client_id"]?.trim();
      if (!clientId || !clientIdSet.has(clientId)) {
        if (clientId && !clientIdSet.has(clientId)) {
          log.issues.push({
            row: i + 1,
            externalId,
            displayName,
            issue: `Client ID "${clientId}" not found, using #Unassigned`,
          });
        }
        clientId = unassignedClientId;
      }

      let ownerId: string | null = data["owner_id"]?.trim() || null;
      if (ownerId && !userIdSet.has(ownerId)) {
        log.issues.push({
          row: i + 1,
          externalId,
          displayName,
          issue: `Owner ID "${ownerId}" not found in users table, setting to null`,
        });
        ownerId = null;
      }

      let primaryContactId: string | null =
        data["primary_contact_id"]?.trim() || null;
      if (primaryContactId && !contactIdSet.has(primaryContactId)) {
        log.issues.push({
          row: i + 1,
          externalId,
          displayName,
          issue: `Primary contact ID "${primaryContactId}" not found in contacts table, setting to null`,
        });
        primaryContactId = null;
      }

      const startedOn = parseDate(data["started_on"]);
      const lastContactOn = parseDate(data["last_contact"]);
      const wonOn = parseDate(data["won_on"]);
      const proposalSentOn = parseDate(data["proposal_sent_on"]);

      const locations = parseJSON(data["locations"]);
      const services = parseServices(data["services"]);

      await db.insert(deals).values({
        externalId: externalId,
        displayName: displayName,
        status: data["status"] || "Prospecting",
        clientId: clientId,
        locations: locations,
        services: services,
        concept: data["concept"] || null,
        notes: data["notes"] || null,
        ownerId: ownerId,
        primaryContactId: primaryContactId,
        budgetNotes: data["budget_notes"] || null,
        projectDate: data["project_date"] || null,
        startedOn: startedOn,
        lastContactOn: lastContactOn,
        wonOn: wonOn,
        proposalSentOn: proposalSentOn,
      });

      log.successfulImports++;
      console.log(`✓ Imported row ${i + 1}: ${displayName}`);
    } catch (error: any) {
      log.failedImports++;
      log.issues.push({
        row: i + 1,
        externalId,
        displayName,
        issue: `Import failed: ${error.message}`,
      });
      console.error(`✗ Failed row ${i + 1}: ${displayName} - ${error.message}`);
    }
  }

  const logContent = `# Deals Import Log

## Summary
- **Total Rows:** ${log.totalRows}
- **Successful Imports:** ${log.successfulImports}
- **Failed Imports:** ${log.failedImports}
- **Issues Found:** ${log.issues.length}

## Issues

${
  log.issues.length === 0
    ? "No issues found."
    : log.issues
        .map(
          (issue) =>
            `### Row ${issue.row}: ${issue.displayName} (External ID: ${issue.externalId})
- ${issue.issue}
`
        )
        .join("\n")
}
`;

  fs.writeFileSync(path.resolve(__dirname, "../deals-import-log.md"), logContent);
  console.log("\n=== Import Complete ===");
  console.log(`Total: ${log.totalRows}`);
  console.log(`Successful: ${log.successfulImports}`);
  console.log(`Failed: ${log.failedImports}`);
  console.log(`Issues: ${log.issues.length}`);
  console.log("\nLog saved to: deals-import-log.md");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
