import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "csv-parse/sync";
import { db } from "../server/db";
import { deals, clients, contacts, clientContacts, industries, dealServices } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATUS_NAME_TO_ID: Record<string, number> = {
  "Prospecting": 1,
  "Initial Contact": 2,
  "Qualified Lead": 3,
  "Negotiation": 4,
  "Closed Won": 5,
  "Closed Lost": 6,
  "Declined by Us": 7,
  "Legacy": 8,
};

const SERVICE_NAME_TO_ID: Record<string, number> = {
  "RSVP Management": 9,
  "Marketing": 10,
  "Referral Agreement (Venues)": 11,
  "Gifting": 12,
  "Programming": 13,
  "Culinary Production": 14,
  "Creative Direction": 15,
  "Talent Programming": 16,
  "Event Production": 17,
  "Liquor Cabinet Program": 18,
  "Event Concepting": 19,
  "Executive Production": 20,
  "Creative Production": 21,
  "Referral Agreement": 22,
  "Content Production": 23,
  "Culinary Programming": 24,
  "Consulting": 25,
  "Concepting": 19,
  "Production": 17,
  "Referral Agreement (Partner)": 22,
};

function parseDateMDY(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === "") return null;
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;
  const month = match[1].padStart(2, "0");
  const day = match[2].padStart(2, "0");
  let year = match[3];
  if (year.length === 2) {
    year = `20${year}`;
  }
  return `${year}-${month}-${day}`;
}

function parseServiceNames(raw: string): string[] {
  if (!raw || raw.trim() === "") return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const result: string[] = [];
      for (const s of parsed) {
        const trimmed = (s as string).trim();
        if (!trimmed) continue;
        if (SERVICE_NAME_TO_ID[trimmed] !== undefined) {
          result.push(trimmed);
        } else {
          const parts = trimmed.split(",").map((p: string) => p.trim()).filter(Boolean);
          if (parts.length > 1 && parts.every(p => SERVICE_NAME_TO_ID[p] !== undefined)) {
            result.push(...parts);
          } else {
            result.push(trimmed);
          }
        }
      }
      return result;
    }
  } catch {
    // not JSON
  }
  return [];
}

async function main() {
  const csvPath = path.resolve(__dirname, "../attached_assets/coc-april_-_final-import_1775667121956.csv");
  const content = fs.readFileSync(csvPath, "utf-8");

  const records: Record<string, string>[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  console.log(`Total CSV rows parsed: ${records.length}`);

  let dealsCreated = 0;
  let dealsUpdated = 0;
  let clientsCreated = 0;
  let contactsCreated = 0;
  let creativeProgServiceId: number | null = null;
  const errors: string[] = [];

  await db.transaction(async (tx) => {
    const existingLiterary = await tx.select().from(industries).where(eq(industries.name, "Literary"));
    let literaryId: string;
    if (existingLiterary.length === 0) {
      const [created] = await tx.insert(industries).values({ name: "Literary" }).returning();
      literaryId = created.id;
      console.log(`Created industry "Literary" with id ${literaryId}`);
    } else {
      literaryId = existingLiterary[0].id;
      console.log(`Industry "Literary" already exists with id ${literaryId}`);
    }

    const existingCP = await tx.select().from(dealServices).where(eq(dealServices.name, "Creative Programming"));
    if (existingCP.length === 0) {
      const [created] = await tx.insert(dealServices).values({ name: "Creative Programming" }).returning();
      creativeProgServiceId = created.id;
      console.log(`Created service "Creative Programming" with id ${creativeProgServiceId}`);
    } else {
      creativeProgServiceId = existingCP[0].id;
      console.log(`Service "Creative Programming" already exists with id ${creativeProgServiceId}`);
    }
    SERVICE_NAME_TO_ID["Creative Programming"] = creativeProgServiceId;

    const allIndustries = await tx.select().from(industries);
    const industryNameToId: Record<string, string> = {};
    for (const ind of allIndustries) {
      industryNameToId[ind.name] = ind.id;
    }

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2;

      const getVal = (col: string): string => {
        return (row[col] || "").trim();
      };

      try {
        const dealId = getVal("deal.id");
        const displayName = getVal("deal.display_name");

        if (!displayName) {
          errors.push(`Row ${rowNum}: Missing display_name, skipping`);
          continue;
        }

        const statusName = getVal("DEAL-STATUS");
        const statusId = STATUS_NAME_TO_ID[statusName];
        if (statusId === undefined) {
          errors.push(`Row ${rowNum} (${displayName}): Unknown status "${statusName}"`);
          continue;
        }

        let clientId = getVal("deal.client_id");
        if (!clientId) {
          const clientName = getVal("client.name");
          if (clientName) {
            const industryName = getVal("client.industry");
            let industryId: string | null = null;
            if (industryName && industryNameToId[industryName]) {
              industryId = industryNameToId[industryName];
            }
            const [newClient] = await tx.insert(clients).values({
              name: clientName,
              industryId: industryId,
            }).returning();
            clientId = newClient.id;
            clientsCreated++;
            console.log(`  Created client "${clientName}" -> ${clientId}`);
          } else {
            errors.push(`Row ${rowNum} (${displayName}): No client_id and no client.name`);
            continue;
          }
        }

        let primaryContactId: string | null = getVal("deal.primary_contact_id") || null;
        if (!primaryContactId) {
          const firstName = getVal("primary_contact.first_name");
          const lastName = getVal("primary_contact.last_name");
          if (firstName && lastName) {
            const title = getVal("primary_contact.title") || null;
            const email = getVal("primary_contact.email") || null;
            const emailAddresses = email ? [email] : null;

            const [newContact] = await tx.insert(contacts).values({
              firstName,
              lastName,
              jobTitle: title,
              emailAddresses,
            }).returning();
            primaryContactId = newContact.id;
            contactsCreated++;
            console.log(`  Created contact "${firstName} ${lastName}" -> ${primaryContactId}`);

            await tx.insert(clientContacts).values({
              clientId,
              contactId: primaryContactId,
            }).onConflictDoNothing();
          }
        }

        const servicesRaw = getVal("DEAL-SERVICES");
        const serviceNames = parseServiceNames(servicesRaw);
        const serviceIds: number[] = [];
        for (const name of serviceNames) {
          const id = SERVICE_NAME_TO_ID[name];
          if (id !== undefined) {
            if (!serviceIds.includes(id)) serviceIds.push(id);
          } else {
            errors.push(`Row ${rowNum} (${displayName}): Unknown service "${name}"`);
          }
        }

        let locations: unknown = [];
        const locationsRaw = getVal("locations");
        if (locationsRaw) {
          try {
            locations = JSON.parse(locationsRaw);
          } catch {
            locations = [];
          }
        }

        const budgetLow = getVal("deal.budget_low");
        const budgetHigh = getVal("deal.budget_high");
        const sortOrder = getVal("deal.sort_order");

        const dealData: Record<string, unknown> = {
          displayName,
          status: statusId,
          clientId,
          locations,
          concept: getVal("deal.concept") || null,
          ownerId: getVal("deal.owner_id") || null,
          primaryContactId,
          notes: getVal("deal.notes") || null,
          budgetLow: budgetLow ? parseInt(budgetLow, 10) || null : null,
          budgetHigh: budgetHigh ? parseInt(budgetHigh, 10) || null : null,
          startedOn: parseDateMDY(getVal("deal.started_on")),
          wonOn: parseDateMDY(getVal("deal.won_on")),
          lastContactOn: parseDateMDY(getVal("deal.last_contact_on")),
          proposalSentOn: parseDateMDY(getVal("deal.proposal_sent_on")),
          sortOrder: sortOrder ? parseInt(sortOrder, 10) || null : null,
          projectDate: getVal("deal.project_date") || null,
          serviceIds: serviceIds.length > 0 ? serviceIds : [],
          locationsText: getVal("deals.locations_text") || null,
          nextSteps: getVal("deals.next_steps") || null,
          budgetNotes: getVal("budget_notes") || null,
        };

        if (dealId) {
          await tx.update(deals)
            .set({ ...dealData, updatedAt: new Date() })
            .where(eq(deals.id, dealId));
          dealsUpdated++;
        } else {
          await tx.insert(deals).values({
            ...dealData,
            status: dealData.status as number,
            clientId: dealData.clientId as string,
            displayName: dealData.displayName as string,
          } as typeof deals.$inferInsert);
          dealsCreated++;
        }

        if ((i + 1) % 50 === 0) {
          console.log(`  Processed ${i + 1}/${records.length} rows...`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Row ${rowNum} (${getVal("deal.display_name")}): ${msg}`);
      }
    }
  });

  console.log("\n=== Import Summary ===");
  console.log(`Total rows in CSV: ${records.length}`);
  console.log(`Deals created: ${dealsCreated}`);
  console.log(`Deals updated: ${dealsUpdated}`);
  console.log(`Clients created: ${clientsCreated}`);
  console.log(`Contacts created: ${contactsCreated}`);
  console.log(`Errors/warnings: ${errors.length}`);
  if (errors.length > 0) {
    console.log("\nError details:");
    errors.forEach(e => console.log(`  ${e}`));
  }

  const expectedTotal = 589;
  const expectedUpdated = 579;
  const expectedCreated = 10;
  const expectedClients = 9;
  let failed = false;

  if (records.length !== expectedTotal) {
    console.error(`ASSERTION FAILED: Expected ${expectedTotal} CSV rows, got ${records.length}`);
    failed = true;
  }
  if (dealsUpdated !== expectedUpdated) {
    console.error(`ASSERTION FAILED: Expected ${expectedUpdated} deals updated, got ${dealsUpdated}`);
    failed = true;
  }
  if (dealsCreated !== expectedCreated) {
    console.error(`ASSERTION FAILED: Expected ${expectedCreated} deals created, got ${dealsCreated}`);
    failed = true;
  }
  if (clientsCreated !== expectedClients) {
    console.error(`ASSERTION FAILED: Expected ${expectedClients} clients created, got ${clientsCreated}`);
    failed = true;
  }

  if (failed) {
    console.error("\nImport completed but count assertions failed. Review the data.");
    process.exit(1);
  }

  console.log("\nAll count assertions passed.");
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
