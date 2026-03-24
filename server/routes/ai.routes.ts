import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { domainEvents } from "../lib/events";
import { type DealWithRelations, type DealStatus, type DealStatusRecord } from "@shared/schema";

const router = Router();

interface DealContextResponse {
  deal: {
    id: string;
    displayName: string;
    status: DealStatus;
    budget: { low: number | null; high: number | null };
    client: { id: string; name: string } | null;
    owner: { id: string; name: string } | null;
    primaryContact: { id: string; name: string; email: string | null } | null;
    projectDate: string | null;
    createdAt: string;
  };
  summary: string;
  suggestedActions: Array<{
    action: string;
    label: string;
    params?: Record<string, unknown>;
  }>;
}

async function formatDealContext(deal: DealWithRelations): Promise<DealContextResponse> {
  const ownerName = deal.owner
    ? `${deal.owner.firstName || ""} ${deal.owner.lastName || ""}`.trim()
    : null;
  const contactName = deal.primaryContact
    ? `${deal.primaryContact.firstName || ""} ${deal.primaryContact.lastName || ""}`.trim()
    : null;
  const contactEmail = deal.primaryContact?.emailAddresses?.[0] || null;

  const suggestedActions = await getSuggestedActions(deal);
  const summary = generateDealSummary(deal, ownerName, contactName);

  return {
    deal: {
      id: deal.id,
      displayName: deal.displayName,
      status: (deal.statusName || "") as DealStatus,
      budget: {
        low: deal.budgetLow,
        high: deal.budgetHigh,
      },
      client: deal.client ? { id: deal.client.id, name: deal.client.name } : null,
      owner: deal.owner && ownerName ? { id: deal.owner.id, name: ownerName } : null,
      primaryContact: deal.primaryContact && contactName
        ? { id: deal.primaryContact.id, name: contactName, email: contactEmail }
        : null,
      projectDate: deal.projectDate || null,
      createdAt: deal.createdAt?.toISOString() || new Date().toISOString(),
    },
    summary,
    suggestedActions,
  };
}

function generateDealSummary(
  deal: DealWithRelations,
  ownerName: string | null,
  _contactName: string | null
): string {
  const parts: string[] = [];

  parts.push(`${deal.statusName || "Unknown"} stage deal`);

  if (deal.client?.name) {
    parts.push(`for ${deal.client.name}`);
  }

  if (deal.budgetLow || deal.budgetHigh) {
    if (deal.budgetLow && deal.budgetHigh) {
      parts.push(`$${deal.budgetLow.toLocaleString()}-${deal.budgetHigh.toLocaleString()} budget`);
    } else if (deal.budgetHigh) {
      parts.push(`up to $${deal.budgetHigh.toLocaleString()} budget`);
    } else if (deal.budgetLow) {
      parts.push(`$${deal.budgetLow.toLocaleString()}+ budget`);
    }
  }

  if (ownerName) {
    parts.push(`owned by ${ownerName}`);
  }

  if (deal.projectDate) {
    const projectDate = new Date(deal.projectDate);
    const now = new Date();
    const diffDays = Math.ceil((projectDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      parts.push(`project in ${diffDays} days`);
    } else if (diffDays === 0) {
      parts.push(`project today`);
    }
  }

  return parts.join(", ");
}

let cachedStatuses: DealStatusRecord[] | null = null;
async function getCachedStatuses(): Promise<DealStatusRecord[]> {
  if (!cachedStatuses) {
    cachedStatuses = await storage.getDealStatuses();
    setTimeout(() => { cachedStatuses = null; }, 60000);
  }
  return cachedStatuses;
}

function buildStageProgression(statuses: DealStatusRecord[]): Record<string, string> {
  const activeStatuses = statuses.filter(s => s.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const progression: Record<string, string> = {};
  for (let i = 0; i < activeStatuses.length - 1; i++) {
    progression[activeStatuses[i].name] = activeStatuses[i + 1].name;
  }
  return progression;
}

async function getSuggestedActions(
  deal: DealWithRelations
): Promise<DealContextResponse["suggestedActions"]> {
  const actions: DealContextResponse["suggestedActions"] = [];
  const statuses = await getCachedStatuses();
  const stageProgression = buildStageProgression(statuses);

  const statusName = deal.statusName || "";
  const nextStage = stageProgression[statusName];
  if (nextStage) {
    actions.push({
      action: "deals.move_stage",
      label: `Move to ${nextStage}`,
      params: { stage: nextStage },
    });
  }

  if (!deal.owner) {
    actions.push({
      action: "deals.assign_owner",
      label: "Assign an owner",
    });
  }

  if (!deal.primaryContact) {
    actions.push({
      action: "deals.update",
      label: "Add primary contact",
      params: { field: "primaryContactId" },
    });
  }

  if (!deal.budgetLow && !deal.budgetHigh) {
    actions.push({
      action: "deals.update",
      label: "Set budget range",
      params: { field: "budget" },
    });
  }

  if (!deal.projectDate) {
    actions.push({
      action: "deals.update",
      label: "Set project date",
      params: { field: "projectDate" },
    });
  }

  return actions;
}

router.get("/context/deal/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deal = await storage.getDealById(id);

    if (!deal) {
      return res.status(404).json({ error: "Deal not found" });
    }

    const context = await formatDealContext(deal);
    return res.json(context);
  } catch (error) {
    console.error("Error fetching deal context:", error);
    return res.status(500).json({ error: "Failed to fetch deal context" });
  }
});

interface WorkspaceContextResponse {
  user: {
    id: string;
    name: string;
    role: string;
  } | null;
  dealsSummary: {
    total: number;
    byStatus: Record<string, number>;
    recentlyUpdated: number;
  };
  pendingTasks: number;
  recentActivity: number;
}

router.get("/context/workspace", async (req: Request, res: Response) => {
  try {
    const user = req.user as { id: string; firstName?: string; lastName?: string; role?: string } | undefined;

    const allDeals = await storage.getDeals();
    const statuses = await getCachedStatuses();
    const byStatus: Record<string, number> = {};

    for (const s of statuses) {
      byStatus[s.name] = 0;
    }

    for (const deal of allDeals) {
      const name = deal.statusName || "Unknown";
      byStatus[name] = (byStatus[name] || 0) + 1;
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentlyUpdated = allDeals.filter((d) => {
      if (!d.updatedAt) return false;
      const updatedDate = d.updatedAt instanceof Date ? d.updatedAt : new Date(d.updatedAt);
      return !isNaN(updatedDate.getTime()) && updatedDate > oneDayAgo;
    }).length;

    const recentEvents = domainEvents.getRecentEvents(50);
    const recentActivity = recentEvents.length;

    const userName = user
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User"
      : null;

    const response: WorkspaceContextResponse = {
      user: user
        ? {
            id: user.id,
            name: userName!,
            role: user.role || "employee",
          }
        : null,
      dealsSummary: {
        total: allDeals.length,
        byStatus,
        recentlyUpdated,
      },
      pendingTasks: 0,
      recentActivity,
    };

    return res.json(response);
  } catch (error) {
    console.error("Error fetching workspace context:", error);
    return res.status(500).json({ error: "Failed to fetch workspace context" });
  }
});

interface ActionDefinition {
  name: string;
  description: string;
  category: string;
  riskLevel: "low" | "medium" | "high";
  parameters: Record<string, { type: string; required: boolean; description: string }>;
}

const availableActions: ActionDefinition[] = [
  {
    name: "deals.list",
    description: "Search and filter deals by status, owner, or search term",
    category: "deals",
    riskLevel: "low",
    parameters: {
      status: { type: "DealStatus[]", required: false, description: "Filter by deal status(es)" },
      ownerId: { type: "string", required: false, description: "Filter by owner user ID" },
      search: { type: "string", required: false, description: "Search in deal name" },
    },
  },
  {
    name: "deals.get",
    description: "Get detailed information about a specific deal",
    category: "deals",
    riskLevel: "low",
    parameters: {
      id: { type: "string", required: true, description: "The deal ID" },
    },
  },
  {
    name: "deals.create",
    description: "Create a new deal in the pipeline",
    category: "deals",
    riskLevel: "medium",
    parameters: {
      displayName: { type: "string", required: true, description: "Name of the deal" },
      clientId: { type: "string", required: false, description: "Associated client ID" },
      status: { type: "DealStatus", required: false, description: "Initial status (default: Prospecting)" },
      budgetLow: { type: "number", required: false, description: "Minimum budget" },
      budgetHigh: { type: "number", required: false, description: "Maximum budget" },
    },
  },
  {
    name: "deals.update",
    description: "Update fields on an existing deal",
    category: "deals",
    riskLevel: "medium",
    parameters: {
      id: { type: "string", required: true, description: "The deal ID" },
      displayName: { type: "string", required: false, description: "Updated name" },
      budgetLow: { type: "number", required: false, description: "Updated minimum budget" },
      budgetHigh: { type: "number", required: false, description: "Updated maximum budget" },
      projectDate: { type: "string", required: false, description: "Project date (ISO format)" },
    },
  },
  {
    name: "deals.move_stage",
    description: "Move a deal to a different pipeline stage",
    category: "deals",
    riskLevel: "medium",
    parameters: {
      id: { type: "string", required: true, description: "The deal ID" },
      stage: { type: "DealStatus", required: true, description: "Target stage" },
    },
  },
  {
    name: "deals.assign_owner",
    description: "Assign or change the owner of a deal",
    category: "deals",
    riskLevel: "medium",
    parameters: {
      id: { type: "string", required: true, description: "The deal ID" },
      ownerId: { type: "string", required: true, description: "User ID of the new owner" },
    },
  },
  {
    name: "deals.delete",
    description: "Delete a deal from the pipeline",
    category: "deals",
    riskLevel: "high",
    parameters: {
      id: { type: "string", required: true, description: "The deal ID to delete" },
    },
  },
  {
    name: "venues.search",
    description: "Search for venues by name or location",
    category: "venues",
    riskLevel: "low",
    parameters: {
      query: { type: "string", required: false, description: "Search term" },
      limit: { type: "number", required: false, description: "Maximum results (default: 20)" },
    },
  },
  {
    name: "venues.get",
    description: "Get detailed information about a specific venue",
    category: "venues",
    riskLevel: "low",
    parameters: {
      id: { type: "string", required: true, description: "The venue ID" },
    },
  },
  {
    name: "contacts.search",
    description: "Search for contacts by name or email",
    category: "contacts",
    riskLevel: "low",
    parameters: {
      query: { type: "string", required: false, description: "Search term" },
      limit: { type: "number", required: false, description: "Maximum results (default: 20)" },
    },
  },
  {
    name: "contacts.get",
    description: "Get detailed information about a specific contact",
    category: "contacts",
    riskLevel: "low",
    parameters: {
      id: { type: "string", required: true, description: "The contact ID" },
    },
  },
];

router.get("/actions", (_req: Request, res: Response) => {
  const groupedByCategory = availableActions.reduce((acc, action) => {
    if (!acc[action.category]) {
      acc[action.category] = [];
    }
    acc[action.category].push(action);
    return acc;
  }, {} as Record<string, ActionDefinition[]>);

  return res.json({
    tools: availableActions,
    byCategory: groupedByCategory,
    total: availableActions.length,
  });
});

router.get("/recent-activity", (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const eventType = req.query.type as string | undefined;

    let events;
    if (eventType && eventType !== "*") {
      events = domainEvents.getRecentEventsByType(eventType as any, limit);
    } else {
      events = domainEvents.getRecentEvents(limit);
    }

    const formattedEvents = events.map((event) => ({
      type: event.type,
      timestamp: event.timestamp.toISOString(),
      actorId: event.actorId,
      summary: formatEventSummary(event),
      data: getEventData(event),
    }));

    return res.json({
      events: formattedEvents,
      count: formattedEvents.length,
    });
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return res.status(500).json({ error: "Failed to fetch recent activity" });
  }
});

function formatEventSummary(event: ReturnType<typeof domainEvents.getRecentEvents>[number]): string {
  switch (event.type) {
    case "deal:created":
      return `Deal "${event.deal.displayName}" was created`;
    case "deal:updated":
      return `Deal "${event.deal.displayName}" was updated`;
    case "deal:deleted":
      return `Deal "${event.displayName}" was deleted`;
    case "deal:stage_changed":
      return `Deal "${event.deal.displayName}" moved from ${event.fromStage} to ${event.toStage}`;
    case "deal:owner_assigned":
      return `Deal "${event.deal.displayName}" owner was ${event.previousOwnerId ? "changed" : "assigned"}`;
    case "deal:task_created":
      return `Task "${event.task.title}" was added to deal`;
    case "deal:task_updated":
      return `Task "${event.task.title}" was updated`;
    case "deal:task_deleted":
      return `Task was removed from deal`;
    default:
      return "Unknown event";
  }
}

function getEventData(event: ReturnType<typeof domainEvents.getRecentEvents>[number]): Record<string, unknown> {
  switch (event.type) {
    case "deal:created":
    case "deal:updated":
      return { dealId: event.deal.id, dealName: event.deal.displayName };
    case "deal:deleted":
      return { dealId: event.dealId };
    case "deal:stage_changed":
      return { dealId: event.deal.id, fromStage: event.fromStage, toStage: event.toStage };
    case "deal:owner_assigned":
      return { dealId: event.deal.id, previousOwnerId: event.previousOwnerId, newOwnerId: event.newOwnerId };
    case "deal:task_created":
    case "deal:task_updated":
      return { dealId: event.dealId, taskId: event.task.id, taskTitle: event.task.title };
    case "deal:task_deleted":
      return { dealId: event.dealId, taskId: event.taskId };
    default:
      return {};
  }
}

export default router;
