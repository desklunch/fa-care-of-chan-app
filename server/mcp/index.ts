import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { storage } from "../storage";
import { DealsService } from "../services/deals.service";
import { ServiceError } from "../services/base.service";
import { dealStatuses, type DealStatus } from "@shared/schema";

const dealsService = new DealsService(storage);

const MCP_ACTOR_ID = "mcp-system";

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

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "coca-mcp-server",
    version: "1.0.0",
  });

  server.tool(
    "deals_list",
    "Search and filter deals by status. Returns a list of deals with their key information.",
    {
      status: z.array(z.enum(dealStatuses as unknown as [string, ...string[]])).optional()
        .describe("Filter by deal status(es). Available statuses: Prospecting, Proposal, Feedback, Contracting, In Progress, Final Invoicing, Complete, No-Go, Canceled, Warm Lead"),
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
    "Create a new deal in the pipeline. Requires a display name and client ID.",
    {
      displayName: z.string().min(1).describe("Name of the deal (e.g., 'Acme Corp Holiday Party')"),
      clientId: z.string().describe("The client ID to associate with this deal"),
      status: z.enum(dealStatuses as unknown as [string, ...string[]]).optional()
        .describe("Initial status (default: Prospecting)"),
      budgetLow: z.number().optional().describe("Minimum budget in dollars"),
      budgetHigh: z.number().optional().describe("Maximum budget in dollars"),
    },
    async ({ displayName, clientId, status, budgetLow, budgetHigh }) => {
      try {
        const deal = await dealsService.create(
          {
            displayName,
            clientId,
            status: (status as DealStatus) || "Prospecting",
            budgetLow: budgetLow ?? null,
            budgetHigh: budgetHigh ?? null,
            locations: [],
          },
          MCP_ACTOR_ID
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `Deal created successfully:\n${JSON.stringify(
                { id: deal.id, displayName: deal.displayName, status: deal.status },
                null,
                2
              )}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error creating deal: ${formatError(error)}` }],
          isError: true,
        };
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

        const deal = await dealsService.update(id, updates, MCP_ACTOR_ID);
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
      stage: z.enum(dealStatuses as unknown as [string, ...string[]])
        .describe("Target stage: Prospecting, Proposal, Feedback, Contracting, In Progress, Final Invoicing, Complete, No-Go, Canceled, or Warm Lead"),
    },
    async ({ id, stage }) => {
      try {
        const deal = await dealsService.moveToStage(id, stage as DealStatus, MCP_ACTOR_ID);
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
        const deal = await dealsService.assignOwner(id, ownerId, MCP_ACTOR_ID);
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
        let venues = await storage.getVenuesWithRelations();
        
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
        const venue = await storage.getVenueByIdWithRelations(id);
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
        let contacts = await storage.getContactsWithRelations();
        
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
        const contact = await storage.getContactById(id);
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
        const deals = await storage.getDeals();
        const byStatus: Record<string, number> = {};
        for (const status of dealStatuses) {
          byStatus[status] = 0;
        }
        for (const deal of deals) {
          byStatus[deal.status] = (byStatus[deal.status] || 0) + 1;
        }
        
        const result = {
          totalDeals: deals.length,
          dealsByStatus: byStatus,
          activeDeals: deals.filter(
            (d) => !["Complete", "No-Go", "Canceled"].includes(d.status)
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

  return server;
}
