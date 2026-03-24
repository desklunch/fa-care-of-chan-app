import { db } from "../../db";
import { dealStatuses } from "@shared/schema";

const SEED_STATUSES = [
  { name: "Prospecting", sortOrder: 1, colorLight: "#6366f1", colorDark: "#818cf8", winProbability: 10, isActive: true, isDefault: false },
  { name: "Initial Contact", sortOrder: 2, colorLight: "#0ea5e9", colorDark: "#38bdf8", winProbability: 20, isActive: true, isDefault: true },
  { name: "Qualified Lead", sortOrder: 3, colorLight: "#8b5cf6", colorDark: "#a78bfa", winProbability: 40, isActive: true, isDefault: false },
  { name: "Negotiation", sortOrder: 4, colorLight: "#f59e0b", colorDark: "#fbbf24", winProbability: 60, isActive: true, isDefault: false },
  { name: "Closed Won", sortOrder: 5, colorLight: "#10b981", colorDark: "#34d399", winProbability: 100, isActive: false, isDefault: false },
  { name: "Closed Lost", sortOrder: 6, colorLight: "#ef4444", colorDark: "#f87171", winProbability: 0, isActive: false, isDefault: false },
  { name: "Declined by Us", sortOrder: 7, colorLight: "#64748b", colorDark: "#94a3b8", winProbability: 0, isActive: false, isDefault: false },
  { name: "Legacy", sortOrder: 8, colorLight: "#9ca3af", colorDark: "#d1d5db", winProbability: 0, isActive: false, isDefault: false },
];

export async function seedDealStatuses(): Promise<void> {
  const existing = await db.select({ id: dealStatuses.id }).from(dealStatuses).limit(1);
  if (existing.length > 0) {
    return;
  }

  console.log("[seed] Inserting deal statuses...");
  await db.insert(dealStatuses).values(SEED_STATUSES);
  console.log(`[seed] Inserted ${SEED_STATUSES.length} deal statuses`);
}
