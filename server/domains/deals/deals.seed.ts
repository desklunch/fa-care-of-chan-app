import { db } from "../../db";
import { dealStatuses } from "@shared/schema";
import { eq } from "drizzle-orm";

const SEED_STATUSES = [
  { name: "Prospecting", sortOrder: 1, colorLight: "#6366f1", colorDark: "#818cf8", winProbability: 10, isActive: true, isDefault: false },
  { name: "Initial Contact", sortOrder: 2, colorLight: "#0ea5e9", colorDark: "#38bdf8", winProbability: 15, isActive: true, isDefault: true },
  { name: "Qualified Lead", sortOrder: 3, colorLight: "#8b5cf6", colorDark: "#a78bfa", winProbability: 25, isActive: true, isDefault: false },
  { name: "Proposal Sent", sortOrder: 5, colorLight: "#d946ef", colorDark: "#e879f9", winProbability: 50, isActive: true, isDefault: false },
  { name: "Negotiation", sortOrder: 6, colorLight: "#f59e0b", colorDark: "#fbbf24", winProbability: 75, isActive: true, isDefault: false },
  { name: "Closed Won", sortOrder: 7, colorLight: "#10b981", colorDark: "#34d399", winProbability: 100, isActive: false, isDefault: false },
  { name: "Closed Lost", sortOrder: 8, colorLight: "#ef4444", colorDark: "#f87171", winProbability: 0, isActive: false, isDefault: false },
  { name: "Declined by Us", sortOrder: 9, colorLight: "#64748b", colorDark: "#94a3b8", winProbability: 0, isActive: false, isDefault: false },
  { name: "Legacy", sortOrder: 10, colorLight: "#9ca3af", colorDark: "#d1d5db", winProbability: 0, isActive: false, isDefault: false },
];

export async function seedDealStatuses(): Promise<void> {
  const existing = await db.select({ id: dealStatuses.id }).from(dealStatuses).limit(1);
  if (existing.length > 0) {
    await migrateDealStatuses();
    return;
  }

  console.log("[seed] Inserting deal statuses...");
  await db.insert(dealStatuses).values(SEED_STATUSES);
  console.log(`[seed] Inserted ${SEED_STATUSES.length} deal statuses`);
}

async function migrateDealStatuses(): Promise<void> {
  const updates: { name: string; sortOrder: number; winProbability: number }[] = [
    { name: "Prospecting", sortOrder: 1, winProbability: 10 },
    { name: "Initial Contact", sortOrder: 2, winProbability: 15 },
    { name: "Qualified Lead", sortOrder: 3, winProbability: 25 },
    { name: "Proposal Sent", sortOrder: 5, winProbability: 50 },
    { name: "Negotiation", sortOrder: 6, winProbability: 75 },
    { name: "Closed Won", sortOrder: 7, winProbability: 100 },
    { name: "Closed Lost", sortOrder: 8, winProbability: 0 },
    { name: "Declined by Us", sortOrder: 9, winProbability: 0 },
    { name: "Legacy", sortOrder: 10, winProbability: 0 },
  ];

  for (const u of updates) {
    await db
      .update(dealStatuses)
      .set({ sortOrder: u.sortOrder, winProbability: u.winProbability })
      .where(eq(dealStatuses.name, u.name));
  }

  const proposalSent = await db
    .select({ id: dealStatuses.id })
    .from(dealStatuses)
    .where(eq(dealStatuses.name, "Proposal Sent"))
    .limit(1);

  if (proposalSent.length === 0) {
    console.log("[migration] Inserting 'Proposal Sent' deal status...");
    await db.insert(dealStatuses).values({
      name: "Proposal Sent",
      sortOrder: 5,
      colorLight: "#d946ef",
      colorDark: "#e879f9",
      winProbability: 50,
      isActive: true,
      isDefault: false,
    });
    console.log("[migration] Inserted 'Proposal Sent' deal status");
  }
}
