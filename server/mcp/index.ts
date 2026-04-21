import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { storage } from "../storage";
import { dealsStorage } from "../domains/deals/deals.storage";
import { DealsService } from "../domains/deals/deals.service";
import { clientsStorage } from "../domains/clients/clients.storage";
import { contactsStorage } from "../domains/contacts/contacts.storage";
import { entityLinksStorage } from "../domains/entity-links/entity-links.storage";
import { ServiceError } from "../services/base.service";
import { type DealStatus, type DealStatusRecord, type FeatureStatus, featureStatuses, featurePriorities } from "@shared/schema";
import { issuesFeaturesStorage } from "../domains/issues-features/issues-features.storage";
import { venuesStorage } from "../domains/venues/venues.storage";
import { getRequestContext } from "../lib/request-context";

const dealsService = new DealsService(storage);

const REPLIT_AGENT_USER_ID = "replit-agent";

function getActorId(): string {
  return getRequestContext()?.userId || REPLIT_AGENT_USER_ID;
}

function getDealUrl(dealId: string): string {
  const base = process.env.APP_URL || process.env.PUBLIC_URL || "";
  return base ? `${base.replace(/\/+$/, "")}/deals/${dealId}` : `/deals/${dealId}`;
}

function structuredError(code: string, message: string, details?: Record<string, unknown>) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ ok: false, error: { code, message, ...(details ? { details } : {}) } }, null, 2),
      },
    ],
    isError: true,
  };
}

function parseProjectDate(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export async function ensureReplitAgentUser(): Promise<void> {
  try {
    await storage.upsertUser({
      id: REPLIT_AGENT_USER_ID,
      email: "agent@replit.system",
      firstName: "Replit",
      lastName: "Agent",
      role: "admin",
    });
    await storage.updateUser(REPLIT_AGENT_USER_ID, { role: "admin" });
    console.log("[MCP] Replit Agent system user ensured");
  } catch (error) {
    console.error("[MCP] Failed to ensure Replit Agent user:", error);
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }
}

function formatError(error: unknown): string {
  if (error instanceof ServiceError) {
    return JSON.stringify({
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function createMcpServer(): Promise<McpServer> {
  const server = new McpServer({
    name: "coca-mcp-server",
    version: "1.0.0",
  });

  const allStatuses = await dealsStorage.getDealStatuses();
  const statusNameList = allStatuses.map((s) => s.name).join(", ");

  server.tool(
    "deals_list",
    "Search and filter deals by status. Returns a list of deals with their key information.",
    {
      status: z.array(z.string()).optional()
        .describe(`Filter by deal status name(s). Available statuses: ${statusNameList}`),
    },
    async ({ status }) => {
      try {
        const deals = await dealsService.list({ status: status as DealStatus[] | undefined });
        const summary = deals.slice(0, 20).map((d) => ({
          id: d.id,
          displayName: d.displayName,
          status: d.status,
          client: d.client?.name || null,
          owner: d.owner ? `${d.owner.firstName} ${d.owner.lastName}`.trim() : null,
          budgetRange: d.budgetLow || d.budgetHigh
            ? `$${d.budgetLow?.toLocaleString() || "?"} - $${d.budgetHigh?.toLocaleString() || "?"}`
            : null,
        }));
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ totalCount: deals.length, deals: summary }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error listing deals: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "deals_get",
    "Get detailed information about a specific deal by ID.",
    {
      id: z.string().describe("The deal ID (UUID format)"),
    },
    async ({ id }) => {
      try {
        const deal = await dealsService.getById(id);
        if (!deal) {
          return {
            content: [{ type: "text" as const, text: `Deal not found: ${id}` }],
            isError: true,
          };
        }
        const result = {
          id: deal.id,
          displayName: deal.displayName,
          status: deal.status,
          client: deal.client ? { id: deal.client.id, name: deal.client.name } : null,
          owner: deal.owner
            ? { id: deal.owner.id, name: `${deal.owner.firstName} ${deal.owner.lastName}`.trim() }
            : null,
          primaryContact: deal.primaryContact
            ? {
                id: deal.primaryContact.id,
                name: `${deal.primaryContact.firstName} ${deal.primaryContact.lastName}`.trim(),
                email: deal.primaryContact.emailAddresses?.[0] || null,
              }
            : null,
          budgetLow: deal.budgetLow,
          budgetHigh: deal.budgetHigh,
          projectDate: deal.projectDate,
          createdAt: deal.createdAt,
        };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error fetching deal: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "deals_create",
    "Create a new deal in the pipeline with rich intake fields. Looks up or creates the client by name (or accepts an existing clientId), and optionally looks up or creates a primary contact (by email match within the client, falling back to name match). Optionally attaches a venue by name. The deal is owned by the API key holder. Returns the new deal id, displayName, status, and a deep link.",
    {
      displayName: z.string().min(1).describe("Name of the deal (e.g., 'Acme Corp Holiday Party'). Required."),
      clientId: z.string().optional().describe("Existing client ID. Provide this OR clientName."),
      clientName: z.string().optional().describe("Client/company name. If no exact match exists, a new client is created. Provide this OR clientId."),
      primaryContact: z.object({
        firstName: z.string().min(1).describe("Contact's first name"),
        lastName: z.string().min(1).describe("Contact's last name"),
        email: z.string().email().optional().describe("Contact's email (used for lookup; preferred match)"),
        phone: z.string().optional().describe("Contact's phone number"),
      }).optional().describe("Primary contact for the deal. Looked up by email within the client, then by name; created if missing and linked to the client."),
      projectDate: z.string().optional().describe("Project / event date. ISO date (YYYY-MM-DD) preferred; common human formats parsed best-effort."),
      budgetLow: z.number().int().optional().describe("Minimum budget in whole dollars (e.g., 40000)."),
      budgetHigh: z.number().int().optional().describe("Maximum budget in whole dollars (e.g., 60000)."),
      location: z.string().optional().describe("Free-text location description (e.g., 'Brooklyn warehouse')."),
      venueName: z.string().optional().describe("Optional venue name. If found in the venue directory it is referenced in the deal notes."),
      concept: z.string().optional().describe("Creative concept / theme."),
      notes: z.string().optional().describe("Additional notes."),
      status: z.string().optional().describe(`Initial status name (defaults to system default). Available: ${statusNameList}`),
    },
    async ({
      displayName,
      clientId,
      clientName,
      primaryContact,
      projectDate,
      budgetLow,
      budgetHigh,
      location,
      venueName,
      concept,
      notes,
      status,
    }) => {
      try {
        const actorId = getActorId();

        // Resolve client
        let resolvedClientId: string | null = clientId ?? null;
        let resolvedClientName: string | null = null;
        let createdClient = false;
        if (!resolvedClientId) {
          if (!clientName || !clientName.trim()) {
            return structuredError("missing_client", "Either clientId or clientName is required.");
          }
          const allClients = await clientsStorage.getClients();
          const target = clientName.trim().toLowerCase();
          const exact = allClients.find((c) => c.name.toLowerCase() === target);
          const partials = exact
            ? []
            : allClients.filter((c) => c.name.toLowerCase().includes(target));
          if (exact) {
            resolvedClientId = exact.id;
            resolvedClientName = exact.name;
          } else if (partials.length === 1) {
            resolvedClientId = partials[0].id;
            resolvedClientName = partials[0].name;
          } else if (partials.length > 1) {
            return structuredError(
              "ambiguous_client",
              `Multiple clients match "${clientName}". Re-call with a more specific clientName or pass clientId.`,
              { matches: partials.map((c) => ({ id: c.id, name: c.name })) }
            );
          } else {
            const created = await clientsStorage.createClient({ name: clientName.trim() });
            resolvedClientId = created.id;
            resolvedClientName = created.name;
            createdClient = true;
          }
        } else {
          const existing = await clientsStorage.getClientById(resolvedClientId);
          if (!existing) {
            return structuredError("client_not_found", `Client not found: ${resolvedClientId}`, {
              clientId: resolvedClientId,
            });
          }
          resolvedClientName = existing.name;
        }

        // Resolve / create primary contact
        let primaryContactId: string | null = null;
        let createdContact = false;
        if (primaryContact) {
          const linked = await clientsStorage.getContactsForClient(resolvedClientId!);
          let match = primaryContact.email
            ? linked.find((c) =>
                (c.emailAddresses ?? []).some(
                  (e) => e.toLowerCase() === primaryContact.email!.toLowerCase()
                )
              )
            : undefined;
          if (!match) {
            match = linked.find(
              (c) =>
                c.firstName?.toLowerCase() === primaryContact.firstName.toLowerCase() &&
                c.lastName?.toLowerCase() === primaryContact.lastName.toLowerCase()
            );
          }
          if (match) {
            primaryContactId = match.id;
          } else {
            const created = await contactsStorage.createContact({
              firstName: primaryContact.firstName,
              lastName: primaryContact.lastName,
              emailAddresses: primaryContact.email ? [primaryContact.email] : null,
              phoneNumbers: primaryContact.phone ? [primaryContact.phone] : null,
            });
            primaryContactId = created.id;
            createdContact = true;
            await clientsStorage.linkClientContact(resolvedClientId!, created.id);
          }
        }

        // Resolve venue (optional, attached by reference into notes/concept)
        let venueRef: { id: string; name: string } | null = null;
        if (venueName && venueName.trim()) {
          const venues = await venuesStorage.getVenuesWithRelations();
          const target = venueName.trim().toLowerCase();
          const exact = venues.find((v) => v.name?.toLowerCase() === target);
          const partial = exact || venues.find((v) => v.name?.toLowerCase().includes(target));
          if (partial) venueRef = { id: partial.id, name: partial.name ?? venueName };
        }

        // Resolve project date
        let resolvedProjectDate: string | null = null;
        if (projectDate) {
          const parsed = parseProjectDate(projectDate);
          if (!parsed) {
            return structuredError(
              "invalid_project_date",
              `Could not parse projectDate "${projectDate}". Use ISO YYYY-MM-DD or a common date format.`,
              { projectDate }
            );
          }
          resolvedProjectDate = parsed;
        }

        // Resolve status
        const allStatuses = await dealsStorage.getDealStatuses();
        let statusId: number;
        if (status) {
          const found = allStatuses.find((s) => s.name.toLowerCase() === status.toLowerCase());
          statusId = found
            ? found.id
            : allStatuses.find((s) => s.isDefault)?.id ?? allStatuses[0].id;
        } else {
          statusId = allStatuses.find((s) => s.isDefault)?.id ?? allStatuses[0].id;
        }

        // Compose notes with provenance
        const noteParts: string[] = [];
        if (notes) noteParts.push(notes.trim());
        noteParts.push("Created via Claude (MCP)");
        const composedNotes = noteParts.join("\n\n");

        const deal = await dealsService.create(
          {
            displayName,
            clientId: resolvedClientId!,
            status: statusId,
            primaryContactId: primaryContactId ?? null,
            ownerId: actorId,
            budgetLow: budgetLow ?? null,
            budgetHigh: budgetHigh ?? null,
            locations: [],
            locationsText: location ?? null,
            concept: concept ?? null,
            notes: composedNotes,
            projectDate: resolvedProjectDate,
          },
          actorId
        );

        if (venueRef) {
          try {
            await entityLinksStorage.createLink({
              entityType: "deal",
              entityId: deal.id,
              url: `/venues/${venueRef.id}`,
              label: `Venue: ${venueRef.name}`,
              createdById: actorId,
            });
          } catch (err) {
            console.error("[MCP] Failed to link venue to deal:", err);
          }
        }

        const summary = {
          id: deal.id,
          displayName: deal.displayName,
          status: deal.status,
          url: getDealUrl(deal.id),
          client: { id: resolvedClientId, name: resolvedClientName, created: createdClient },
          primaryContact: primaryContactId
            ? { id: primaryContactId, created: createdContact }
            : null,
          venue: venueRef,
          projectDate: resolvedProjectDate,
          source: "Created via Claude (MCP)",
        };

        return {
          content: [
            {
              type: "text" as const,
              text: `Deal created successfully:\n${JSON.stringify(summary, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return structuredError("create_failed", "Error creating deal", { detail: formatError(error) });
      }
    }
  );

  server.tool(
    "deals_update",
    "Update fields on an existing deal.",
    {
      id: z.string().describe("The deal ID to update"),
      displayName: z.string().optional().describe("Updated name"),
      budgetLow: z.number().nullable().optional().describe("Updated minimum budget"),
      budgetHigh: z.number().nullable().optional().describe("Updated maximum budget"),
      projectDate: z.string().nullable().optional().describe("Updated project date"),
    },
    async ({ id, displayName, budgetLow, budgetHigh, projectDate }) => {
      try {
        const updates: Record<string, unknown> = {};
        if (displayName !== undefined) updates.displayName = displayName;
        if (budgetLow !== undefined) updates.budgetLow = budgetLow;
        if (budgetHigh !== undefined) updates.budgetHigh = budgetHigh;
        if (projectDate !== undefined) updates.projectDate = projectDate;

        const deal = await dealsService.update(id, updates, getActorId());
        return {
          content: [
            {
              type: "text" as const,
              text: `Deal updated successfully:\n${JSON.stringify(
                { id: deal.id, displayName: deal.displayName, status: deal.status },
                null,
                2
              )}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error updating deal: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "deals_move_stage",
    "Move a deal to a different pipeline stage.",
    {
      id: z.string().describe("The deal ID"),
      stage: z.string()
        .describe(`Target stage name: ${allStatuses.filter(s => s.isActive).map(s => s.name).join(", ")}`),
    },
    async ({ id, stage }) => {
      try {
        const deal = await dealsService.moveToStage(id, stage as DealStatus, getActorId());
        return {
          content: [
            {
              type: "text" as const,
              text: `Deal stage updated:\n${JSON.stringify(
                { id: deal.id, displayName: deal.displayName, status: deal.status },
                null,
                2
              )}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error moving deal stage: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "deals_assign_owner",
    "Assign or change the owner of a deal.",
    {
      id: z.string().describe("The deal ID"),
      ownerId: z.string().describe("The user ID of the new owner"),
    },
    async ({ id, ownerId }) => {
      try {
        const deal = await dealsService.assignOwner(id, ownerId, getActorId());
        return {
          content: [
            {
              type: "text" as const,
              text: `Deal owner assigned:\n${JSON.stringify(
                { id: deal.id, displayName: deal.displayName, ownerId: deal.ownerId },
                null,
                2
              )}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error assigning owner: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "venues_search",
    "Search for venues by name. Returns a list of matching venues.",
    {
      query: z.string().optional().describe("Search term to filter venues by name"),
      limit: z.number().optional().default(20).describe("Maximum number of results (default: 20)"),
    },
    async ({ query, limit }) => {
      try {
        let venues = await venuesStorage.getVenuesWithRelations();
        
        if (query) {
          const lowerQuery = query.toLowerCase();
          venues = venues.filter(
            (v) => v.name?.toLowerCase().includes(lowerQuery) || v.city?.toLowerCase().includes(lowerQuery)
          );
        }
        
        const results = venues.slice(0, limit || 20).map((v) => ({
          id: v.id,
          name: v.name,
          city: v.city,
          state: v.state,
        }));
        
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ totalCount: venues.length, venues: results }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error searching venues: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "venues_get",
    "Get detailed information about a specific venue by ID.",
    {
      id: z.string().describe("The venue ID"),
    },
    async ({ id }) => {
      try {
        const venue = await venuesStorage.getVenueByIdWithRelations(id);
        if (!venue) {
          return {
            content: [{ type: "text" as const, text: `Venue not found: ${id}` }],
            isError: true,
          };
        }
        const result = {
          id: venue.id,
          name: venue.name,
          streetAddress1: venue.streetAddress1,
          streetAddress2: venue.streetAddress2,
          city: venue.city,
          state: venue.state,
          zipCode: venue.zipCode,
          phone: venue.phone,
          website: venue.website,
          shortDescription: venue.shortDescription,
          longDescription: venue.longDescription,
        };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error fetching venue: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "contacts_search",
    "Search for contacts by name or email.",
    {
      query: z.string().optional().describe("Search term to filter contacts"),
      limit: z.number().optional().default(20).describe("Maximum number of results (default: 20)"),
    },
    async ({ query, limit }) => {
      try {
        let contacts = await contactsStorage.getContactsWithRelations();
        
        if (query) {
          const lowerQuery = query.toLowerCase();
          contacts = contacts.filter(
            (c) =>
              c.firstName?.toLowerCase().includes(lowerQuery) ||
              c.lastName?.toLowerCase().includes(lowerQuery) ||
              c.emailAddresses?.some((e) => e?.toLowerCase().includes(lowerQuery))
          );
        }
        
        const results = contacts.slice(0, limit || 20).map((c) => ({
          id: c.id,
          name: `${c.firstName || ""} ${c.lastName || ""}`.trim(),
          email: c.emailAddresses?.[0] || null,
          jobTitle: c.jobTitle,
        }));
        
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ totalCount: contacts.length, contacts: results }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error searching contacts: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "contacts_get",
    "Get detailed information about a specific contact by ID.",
    {
      id: z.string().describe("The contact ID"),
    },
    async ({ id }) => {
      try {
        const contact = await contactsStorage.getContactById(id);
        if (!contact) {
          return {
            content: [{ type: "text" as const, text: `Contact not found: ${id}` }],
            isError: true,
          };
        }
        const result = {
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          emailAddresses: contact.emailAddresses,
          phoneNumbers: contact.phoneNumbers,
          jobTitle: contact.jobTitle,
          instagramUsername: contact.instagramUsername,
          linkedinUsername: contact.linkedinUsername,
        };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error fetching contact: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "workspace_summary",
    "Get a summary of the current workspace state including deals by status and recent activity.",
    {},
    async () => {
      try {
        const [deals, allStatuses] = await Promise.all([
          dealsStorage.getDeals(),
          dealsStorage.getDealStatuses(),
        ]);
        const byStatus: Record<string, number> = {};
        for (const s of allStatuses) {
          byStatus[s.name] = 0;
        }
        const activeStatusNames = new Set(allStatuses.filter(s => s.isActive).map(s => s.name));
        for (const deal of deals) {
          const name = deal.statusName || "Unknown";
          byStatus[name] = (byStatus[name] || 0) + 1;
        }
        
        const result = {
          totalDeals: deals.length,
          dealsByStatus: byStatus,
          activeDeals: deals.filter(
            (d) => activeStatusNames.has(d.statusName || "")
          ).length,
        };
        
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error fetching workspace summary: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "features_list",
    "List and filter feature requests by status and/or category. Returns feature summaries.",
    {
      status: z.array(z.enum(featureStatuses)).optional()
        .describe(`Filter by feature status. Available: ${featureStatuses.join(", ")}`),
      categoryId: z.string().optional()
        .describe("Filter by category ID"),
      limit: z.number().optional().default(20)
        .describe("Maximum number of results (default: 20)"),
    },
    async ({ status, categoryId, limit }) => {
      try {
        const features = await issuesFeaturesStorage.getFeatures({
          status: status as FeatureStatus[] | undefined,
          categoryId,
        });
        const summary = features.slice(0, limit || 20).map((f) => ({
          id: f.id,
          title: f.title,
          status: f.status,
          priority: f.priority,
          category: f.category?.name || null,
          description: f.description ? f.description.substring(0, 200) : null,
          voteCount: f.voteCount,
          createdAt: f.createdAt,
        }));
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ totalCount: features.length, features: summary }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error listing features: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "features_get",
    "Get detailed information about a specific feature by ID, including comments, category, and creator.",
    {
      id: z.string().describe("The feature ID (UUID format)"),
    },
    async ({ id }) => {
      try {
        const feature = await issuesFeaturesStorage.getFeatureById(id);
        if (!feature) {
          return {
            content: [{ type: "text" as const, text: `Feature not found: ${id}` }],
            isError: true,
          };
        }
        const comments = await issuesFeaturesStorage.getComments(id);
        const result = {
          id: feature.id,
          title: feature.title,
          description: feature.description,
          status: feature.status,
          priority: feature.priority,
          category: feature.category ? { id: feature.category.id, name: feature.category.name } : null,
          createdBy: feature.createdBy
            ? { id: feature.createdBy.id, name: `${feature.createdBy.firstName || ""} ${feature.createdBy.lastName || ""}`.trim() }
            : null,
          voteCount: feature.voteCount,
          estimatedDelivery: feature.estimatedDelivery,
          completedAt: feature.completedAt,
          createdAt: feature.createdAt,
          updatedAt: feature.updatedAt,
          comments: comments.map((c) => ({
            id: c.id,
            body: c.body,
            userName: c.userName,
            createdAt: c.createdAt,
          })),
        };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error fetching feature: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "features_update",
    "Update a feature's status, priority, title, and/or description. Handles completedAt timestamp automatically.",
    {
      id: z.string().describe("The feature ID to update"),
      status: z.enum(featureStatuses).optional()
        .describe(`New status. Available: ${featureStatuses.join(", ")}`),
      priority: z.enum(featurePriorities).optional()
        .describe(`New priority. Available: ${featurePriorities.join(", ")}`),
      title: z.string().optional().describe("Updated title"),
      description: z.string().optional().describe("Updated description"),
    },
    async ({ id, status, priority, title, description }) => {
      try {
        const existing = await issuesFeaturesStorage.getFeatureById(id);
        if (!existing) {
          return {
            content: [{ type: "text" as const, text: `Feature not found: ${id}` }],
            isError: true,
          };
        }

        const updateData: Record<string, unknown> = {};
        if (status !== undefined) updateData.status = status;
        if (priority !== undefined) updateData.priority = priority;
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;

        if (status !== undefined) {
          const wasCompleted = existing.status === "completed";
          const isNowCompleted = status === "completed";
          if (!wasCompleted && isNowCompleted) {
            updateData.completedAt = new Date();
          } else if (wasCompleted && !isNowCompleted) {
            updateData.completedAt = null;
          }
        }

        const updated = await issuesFeaturesStorage.updateFeature(id, updateData);
        return {
          content: [
            {
              type: "text" as const,
              text: `Feature updated successfully:\n${JSON.stringify(
                { id: updated.id, title: updated.title, status: updated.status, priority: updated.priority },
                null,
                2
              )}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error updating feature: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "features_add_comment",
    "Post a comment to a feature on behalf of the calling API key holder.",
    {
      featureId: z.string().describe("The feature ID to comment on"),
      body: z.string().min(1).max(2000).describe("The comment text"),
    },
    async ({ featureId, body }) => {
      try {
        const feature = await issuesFeaturesStorage.getFeatureById(featureId);
        if (!feature) {
          return {
            content: [{ type: "text" as const, text: `Feature not found: ${featureId}` }],
            isError: true,
          };
        }

        const comment = await issuesFeaturesStorage.createComment(featureId, getActorId(), body);
        return {
          content: [
            {
              type: "text" as const,
              text: `Comment added to feature "${feature.title}":\n${JSON.stringify(
                { id: comment.id, featureId: comment.featureId, createdAt: comment.createdAt },
                null,
                2
              )}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error adding comment: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "features_list_categories",
    "List available feature categories with their IDs and names.",
    {},
    async () => {
      try {
        const categories = await storage.getCategories(false);
        const result = categories.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          color: c.color,
        }));
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ categories: result }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error listing categories: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  return server;
}
