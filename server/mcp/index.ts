import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { storage } from "../storage";
import { dealsStorage } from "../domains/deals/deals.storage";
import { DealsService } from "../domains/deals/deals.service";
import { clientsStorage } from "../domains/clients/clients.storage";
import { contactsStorage } from "../domains/contacts/contacts.storage";
import { entityLinksStorage } from "../domains/entity-links/entity-links.storage";
import { ServiceError } from "../services/base.service";
import { type DealStatus, type DealStatusRecord, type FeatureStatus, featureStatuses, featurePriorities, type FormSection, type FormField, type FormFieldType, mappableEntities, insertDealIntakeSchema } from "@shared/schema";
import { issuesFeaturesStorage } from "../domains/issues-features/issues-features.storage";
import { venuesStorage } from "../domains/venues/venues.storage";
import { getRequestContext } from "../lib/request-context";
import { formsStorage } from "../domains/forms/forms.storage";
import { computeIntakeSync, applyIntakeSync } from "../domains/deals/intake-sync";
import { domainEvents } from "../lib/events";

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

  // ==========================================
  // DEAL INTAKE TOOLS (form templates + intake)
  // ==========================================

  function flattenFields(formSchema: FormSection[]): FormField[] {
    const out: FormField[] = [];
    for (const section of formSchema) {
      for (const field of section.fields) out.push(field);
    }
    return out;
  }

  function coerceFieldValue(
    field: FormField,
    raw: unknown,
  ): { ok: true; value: unknown } | { ok: false; error: string } {
    const t: FormFieldType = field.type;

    if (raw === null || raw === undefined || raw === "") {
      return { ok: true, value: null };
    }

    // Entity-mapped fields validate via the mapped property's schema
    if (field.entityMapping?.entityType === "deal" && field.entityMapping?.propertyKey) {
      const propDef = mappableEntities.deal.properties.find(
        (p) => p.key === field.entityMapping!.propertyKey,
      );
      if (propDef) {
        const parsed = propDef.valueSchema.safeParse(raw);
        if (!parsed.success) {
          return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
        }
        return { ok: true, value: parsed.data };
      }
    }

    switch (t) {
      case "text":
      case "textarea":
      case "richtext":
      case "url":
      case "email":
      case "phone": {
        if (typeof raw !== "string") return { ok: false, error: `Expected string for field type ${t}` };
        return { ok: true, value: raw };
      }
      case "number": {
        const n = typeof raw === "number" ? raw : Number(raw);
        if (Number.isNaN(n)) return { ok: false, error: "Expected a number" };
        return { ok: true, value: n };
      }
      case "checkbox":
      case "toggle": {
        if (typeof raw === "boolean") return { ok: true, value: raw };
        if (raw === "true") return { ok: true, value: true };
        if (raw === "false") return { ok: true, value: false };
        return { ok: false, error: "Expected a boolean" };
      }
      case "date": {
        if (typeof raw !== "string") return { ok: false, error: "Expected an ISO date string (YYYY-MM-DD)" };
        const trimmed = raw.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return { ok: true, value: trimmed };
        const d = new Date(trimmed);
        if (Number.isNaN(d.getTime())) return { ok: false, error: "Invalid date" };
        return { ok: true, value: d.toISOString().slice(0, 10) };
      }
      case "select": {
        if (typeof raw !== "string") return { ok: false, error: "Expected a string option" };
        if (field.options && field.options.length > 0 && !field.options.includes(raw)) {
          return { ok: false, error: `Value must be one of: ${field.options.join(", ")}` };
        }
        return { ok: true, value: raw };
      }
      case "array":
      case "tags":
      case "services":
      case "location":
      case "eventSchedule": {
        if (!Array.isArray(raw)) return { ok: false, error: `Expected an array for field type ${t}` };
        return { ok: true, value: raw };
      }
      default:
        return { ok: true, value: raw };
    }
  }

  function summarizeField(field: FormField) {
    return {
      id: field.id,
      name: field.name,
      type: field.type,
      required: field.required ?? false,
      options: field.options ?? null,
      description: field.description ?? null,
      entityMapping: field.entityMapping ?? null,
    };
  }

  function isFieldAnswered(field: FormField, value: unknown): boolean {
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value as object).length === 0) return false;
    if (field.type === "select" && field.options && field.options.length > 0) {
      return typeof value === "string" && field.options.includes(value);
    }
    return true;
  }

  // Seeded default intake template id (see server/domains/forms/forms.seed.ts).
  const DEFAULT_INTAKE_TEMPLATE_ID = "event-production-intake";

  server.tool(
    "intake_templates_list",
    "List form templates that can be used as a deal intake. Returns id, name, category, description, isDefault, and field count.",
    {
      query: z.string().optional().describe("Optional substring filter on template name or category"),
      limit: z.number().optional().default(50).describe("Max results (default 50)"),
    },
    async ({ query, limit }) => {
      try {
        const templates = await formsStorage.getFormTemplates();
        const q = query?.trim().toLowerCase();
        const filtered = q
          ? templates.filter(
              (t) =>
                t.name.toLowerCase().includes(q) ||
                (t.category ?? "").toLowerCase().includes(q),
            )
          : templates;
        const results = filtered.slice(0, limit || 50).map((t) => {
          const schema = (t.formSchema as FormSection[]) ?? [];
          const fieldCount = schema.reduce((acc, s) => acc + (s.fields?.length ?? 0), 0);
          return {
            id: t.id,
            name: t.name,
            category: t.category,
            description: t.description,
            isDefault: t.id === DEFAULT_INTAKE_TEMPLATE_ID,
            sectionCount: schema.length,
            fieldCount,
          };
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ totalCount: filtered.length, templates: results }, null, 2),
            },
          ],
        };
      } catch (error) {
        return structuredError("templates_list_failed", "Error listing form templates", { detail: formatError(error) });
      }
    },
  );

  server.tool(
    "intake_templates_get",
    "Get a form template's full schema (sections and fields) by ID. Use this before intake_start to understand what questions Claude will ask.",
    {
      id: z.string().describe("The form template ID"),
    },
    async ({ id }) => {
      try {
        const template = await formsStorage.getFormTemplateById(id);
        if (!template) {
          return structuredError("template_not_found", `Form template not found: ${id}`);
        }
        const schema = (template.formSchema as FormSection[]) ?? [];
        const sections = schema.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description ?? null,
          fields: s.fields.map(summarizeField),
        }));
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  id: template.id,
                  name: template.name,
                  category: template.category,
                  description: template.description,
                  sections,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return structuredError("template_get_failed", "Error fetching form template", { detail: formatError(error) });
      }
    },
  );

  server.tool(
    "intake_start",
    "Start (or resume) an intake on a deal using a form template. If an intake with the same template already exists it is returned as-is. If a different template is currently attached, it is replaced. Attribution: actions are recorded under the calling API key user via Claude (MCP).",
    {
      dealId: z.string().describe("The deal ID to attach the intake to"),
      templateId: z.string().describe("The form template ID to use"),
    },
    async ({ dealId, templateId }) => {
      try {
        const actorId = getActorId();
        const deal = await dealsStorage.getDealById(dealId);
        if (!deal) return structuredError("deal_not_found", `Deal not found: ${dealId}`);

        const template = await formsStorage.getFormTemplateById(templateId);
        if (!template) return structuredError("template_not_found", `Form template not found: ${templateId}`);

        const existing = await dealsStorage.getDealIntake(dealId);
        let intake;
        let resumed = false;
        if (existing && existing.templateId === templateId) {
          intake = existing;
          resumed = true;
        } else {
          if (existing) {
            await dealsStorage.deleteDealIntake(dealId);
            domainEvents.emit({
              type: "deal:intake_deleted",
              intakeId: existing.id,
              dealId,
              actorId,
              timestamp: new Date(),
            });
          }
          const intakeData = {
            dealId,
            templateId: template.id,
            templateName: template.name,
            formSchema: template.formSchema,
            responseData: {},
            status: "draft" as const,
          };
          const parsed = insertDealIntakeSchema.safeParse(intakeData);
          if (!parsed.success) {
            return structuredError("invalid_intake_data", "Failed to validate intake data", { errors: parsed.error.flatten() });
          }
          intake = await dealsStorage.createDealIntake(parsed.data, actorId);
          domainEvents.emit({
            type: "deal:intake_created",
            intakeId: intake.id,
            dealId,
            templateId,
            templateName: template.name,
            actorId,
            timestamp: new Date(),
          });
        }

        const fields = flattenFields(intake.formSchema as FormSection[]);
        const responses = (intake.responseData as Record<string, unknown>) ?? {};
        const answeredCount = fields.filter((f) => isFieldAnswered(f, responses[f.id])).length;
        const requiredCount = fields.filter((f) => f.required).length;

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  ok: true,
                  resumed,
                  intakeId: intake.id,
                  dealId,
                  dealUrl: getDealUrl(dealId),
                  template: { id: template.id, name: template.name },
                  totalFields: fields.length,
                  requiredFields: requiredCount,
                  answeredFields: answeredCount,
                  responseData: responses,
                  source: resumed ? "Resumed via Claude (MCP)" : "Started via Claude (MCP)",
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return structuredError("intake_start_failed", "Error starting intake", { detail: formatError(error) });
      }
    },
  );

  server.tool(
    "intake_set_responses",
    "Merge answers into an in-progress intake. Pass an array of { fieldId, value } items. Each value is validated against the field's type and (if mapped to a deal property) the property's schema. Returns the merged response set plus per-field accept/reject results. File/attachment fields are not supported.",
    {
      intakeId: z.string().describe("The intake ID returned by intake_start"),
      responses: z
        .array(
          z.object({
            fieldId: z.string().describe("The form field ID (from intake_templates_get)"),
            value: z.any().describe("The value to set; null/empty clears the field"),
          }),
        )
        .min(1)
        .describe("Field response items to set/merge"),
    },
    async ({ intakeId, responses }) => {
      try {
        const actorId = getActorId();
        const intake = await dealsStorage.getDealIntakeById(intakeId);
        if (!intake) {
          return structuredError("intake_not_found", `Intake not found: ${intakeId}. Call intake_start first.`);
        }
        const dealId = intake.dealId;

        const fields = flattenFields(intake.formSchema as FormSection[]);
        const fieldsById = new Map(fields.map((f) => [f.id, f]));
        const current: Record<string, unknown> = { ...((intake.responseData as Record<string, unknown>) ?? {}) };

        const accepted: Array<{ fieldId: string; name: string; value: unknown }> = [];
        const rejected: Array<{ fieldId: string; name: string | null; reason: string }> = [];

        for (const item of responses) {
          const field = fieldsById.get(item.fieldId);
          if (!field) {
            rejected.push({ fieldId: item.fieldId, name: null, reason: "Unknown fieldId for this intake" });
            continue;
          }
          const result = coerceFieldValue(field, item.value);
          if (!result.ok) {
            rejected.push({ fieldId: item.fieldId, name: field.name, reason: result.error });
            continue;
          }
          if (result.value === null) {
            delete current[item.fieldId];
          } else {
            current[item.fieldId] = result.value;
          }
          accepted.push({ fieldId: item.fieldId, name: field.name, value: result.value });
        }

        if (accepted.length > 0) {
          await dealsStorage.updateDealIntake(dealId, { responseData: current });
          domainEvents.emit({
            type: "deal:intake_updated",
            intakeId: intake.id,
            dealId,
            actorId,
            timestamp: new Date(),
          });
        }

        const answeredCount = fields.filter((f) => isFieldAnswered(f, current[f.id])).length;

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  ok: true,
                  intakeId: intake.id,
                  dealId,
                  acceptedCount: accepted.length,
                  rejectedCount: rejected.length,
                  accepted,
                  rejected,
                  totalFields: fields.length,
                  answeredFields: answeredCount,
                  responseData: current,
                  source: "Updated via Claude (MCP)",
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return structuredError("intake_set_failed", "Error updating intake responses", { detail: formatError(error) });
      }
    },
  );

  server.tool(
    "intake_status",
    "Report intake progress: total/required/answered counts, missing required fields, fields whose stored value fails revalidation, and a preview of pending sync changes (intake values that differ from the deal).",
    {
      intakeId: z.string().describe("The intake ID returned by intake_start"),
    },
    async ({ intakeId }) => {
      try {
        const intake = await dealsStorage.getDealIntakeById(intakeId);
        if (!intake) {
          return structuredError("intake_not_found", `Intake not found: ${intakeId}`);
        }
        const dealId = intake.dealId;
        const fields = flattenFields(intake.formSchema as FormSection[]);
        const responses = (intake.responseData as Record<string, unknown>) ?? {};
        const answered = fields.filter((f) => isFieldAnswered(f, responses[f.id]));
        const missingRequired = fields
          .filter((f) => f.required && !isFieldAnswered(f, responses[f.id]))
          .map(summarizeField);
        const unansweredOptional = fields
          .filter((f) => !f.required && !isFieldAnswered(f, responses[f.id]))
          .map(summarizeField);

        const validationErrors: Array<{ fieldId: string; name: string; reason: string }> = [];
        for (const f of fields) {
          const v = responses[f.id];
          if (v === undefined || v === null || v === "") continue;
          const result = coerceFieldValue(f, v);
          if (!result.ok) {
            validationErrors.push({ fieldId: f.id, name: f.name, reason: result.error });
          }
        }

        const computed = await computeIntakeSync(dealsService, dealId);
        const pendingSync = computed
          ? computed.changes.map((c) => ({
              fieldId: c.fieldId,
              propertyKey: c.propertyKey,
              label: c.label,
              currentValue: c.currentValue,
              newValue: c.newValue,
            }))
          : [];

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  ok: true,
                  intakeId: intake.id,
                  dealId,
                  dealUrl: getDealUrl(dealId),
                  template: { id: intake.templateId, name: intake.templateName },
                  status: intake.status,
                  totalFields: fields.length,
                  requiredFields: fields.filter((f) => f.required).length,
                  answeredFields: answered.length,
                  isComplete: missingRequired.length === 0 && validationErrors.length === 0,
                  missingRequired,
                  unansweredOptional,
                  validationErrors,
                  pendingSyncChanges: pendingSync,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return structuredError("intake_status_failed", "Error fetching intake status", { detail: formatError(error) });
      }
    },
  );

  server.tool(
    "intake_sync_to_deal",
    "Sync intake responses back to mapped deal fields. Set dryRun=true to preview without writing. Returns the changed-fields summary and the deal's deep link. Audit entries are attributed to the calling API key user via Claude (MCP).",
    {
      intakeId: z.string().describe("The intake ID returned by intake_start"),
      dryRun: z.boolean().optional().default(false).describe("Preview changes without applying them"),
    },
    async ({ intakeId, dryRun }) => {
      try {
        const actorId = getActorId();
        const intake = await dealsStorage.getDealIntakeById(intakeId);
        if (!intake) {
          return structuredError("intake_not_found", `Intake not found: ${intakeId}`);
        }
        const dealId = intake.dealId;
        const dealUrl = getDealUrl(dealId);

        if (dryRun) {
          const computed = await computeIntakeSync(dealsService, dealId);
          if (!computed) {
            return structuredError("intake_not_found", `No intake found for deal ${dealId}`);
          }
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    ok: true,
                    dryRun: true,
                    intakeId: intake.id,
                    dealId,
                    dealUrl,
                    changes: computed.changes,
                    changeCount: computed.changes.length,
                    changedProperties: computed.changes.map((c) => c.propertyKey),
                    source: "Preview via Claude (MCP)",
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        const result = await applyIntakeSync(dealsService, dealId, actorId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  ok: true,
                  intakeId: intake.id,
                  dealId,
                  dealUrl,
                  applied: result.applied,
                  changes: result.changes,
                  changeCount: result.changes.length,
                  changedProperties: result.changes.map((c) => c.propertyKey),
                  message: result.message,
                  source: "Synced via Claude (MCP)",
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return structuredError("intake_sync_failed", "Error syncing intake to deal", { detail: formatError(error) });
      }
    },
  );

  return server;
}
