import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { loadPermissions, checkPermission } from "../../middleware/permissions";
import { venuesStorage } from "../venues/venues.storage";
import { clientsStorage } from "../clients/clients.storage";
import { vendorsStorage } from "../vendors/vendors.storage";
import { referenceDataStorage } from "../reference-data/reference-data.storage";
import { storage } from "../../storage";
import { logAuditEvent } from "../../audit";
import type { PermissionContext } from "../../../shared/permissions";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SYSTEM_PROMPT = `You are a helpful AI assistant for Care of Chan OS, an enterprise management system for managing venues, vendors, clients, contacts, and deals.

You have access to read data from all major domains in the system:
- VENUES: Search and view venue details, generate and update descriptions
- CLIENTS: Search and view client organizations
- VENDORS: Search and view vendor companies and their services
- DEALS: Search and view deals (sales pipeline) - requires manager/admin access

VENUE DESCRIPTION WORKFLOW:
1. When a user asks you to generate a description for a venue, first use the search_venues tool to find the venue in the database
2. Once you have the venue details (name, address, city, state), use the get_venue_details tool to get more information
3. Based on the venue name and location, use your knowledge and web search capabilities to gather information about the venue
4. Generate a compelling 2-paragraph editorial description
5. Present the description and ask if the user would like any edits
6. Once they approve, use the update_venue_description tool to save it
7. After saving, provide a link to the venue's detail page in markdown format: [View Venue](/venues/{venue_id})

DESCRIPTION GUIDELINES:
- Write in a professional, engaging tone suitable for a venue directory
- Focus on what makes the venue unique, its atmosphere, notable features, and what visitors can expect
- Include relevant details about cuisine, ambiance, history, or special offerings
- Keep each paragraph concise but informative (3-5 sentences each)
- If you cannot find specific information about a venue, create a compelling general description based on its type and location

GENERAL QUERYING:
- When users ask about clients, vendors, or deals, use the appropriate search tools
- Provide concise summaries with links to detail pages where applicable
- For clients: [View Client](/clients/{id})
- For vendors: [View Vendor](/vendors/{id})
- For deals: [View Deal](/deals/{id})

Always be helpful, concise, and professional.`;

const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_venues",
      description: "Search for venues in the database by name. Returns venue ID, name, address, and current description.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The venue name or partial name to search for",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_venue_details",
      description: "Get detailed information about a specific venue by ID",
      parameters: {
        type: "object",
        properties: {
          venue_id: {
            type: "string",
            description: "The venue ID",
          },
        },
        required: ["venue_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_venue_description",
      description: "Update the long_description field of a venue. Only call this after the user has approved the description.",
      parameters: {
        type: "object",
        properties: {
          venue_id: {
            type: "string",
            description: "The venue ID to update",
          },
          description: {
            type: "string",
            description: "The new long description for the venue",
          },
        },
        required: ["venue_id", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_clients",
      description: "Search for clients (organizations) by name. Returns client ID, name, and basic info.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The client name or partial name to search for",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_client_details",
      description: "Get detailed information about a specific client by ID",
      parameters: {
        type: "object",
        properties: {
          client_id: {
            type: "string",
            description: "The client ID",
          },
        },
        required: ["client_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_vendors",
      description: "Search for vendors by name. Returns vendor ID, name, website, and services.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The vendor name or partial name to search for",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_vendor_details",
      description: "Get detailed information about a specific vendor by ID",
      parameters: {
        type: "object",
        properties: {
          vendor_id: {
            type: "string",
            description: "The vendor ID",
          },
        },
        required: ["vendor_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_deals",
      description: "Search for deals by name or filter by status. Returns deal ID, name, client, status, and value. Requires manager or admin access.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The deal name or partial name to search for (optional)",
          },
          status: {
            type: "string",
            description: "Filter by deal status: lead, qualified, proposal, negotiation, closed_won, closed_lost (optional)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_deal_details",
      description: "Get detailed information about a specific deal by ID. Requires manager or admin access.",
      parameters: {
        type: "object",
        properties: {
          deal_id: {
            type: "string",
            description: "The deal ID",
          },
        },
        required: ["deal_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_amenities",
      description: "List all available amenities that can be assigned to venues.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tags",
      description: "List all tags (cuisine and style categories) that can be assigned to venues.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Filter by category: 'cuisine' or 'style' (optional)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_industries",
      description: "List all industries that can be assigned to clients and deals.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_vendor_services",
      description: "List all vendor service categories.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_deal_services",
      description: "List all deal service types available for deals.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_venues_by_amenity",
      description: "Find all venues that have a specific amenity. Use list_amenities first to get amenity IDs.",
      parameters: {
        type: "object",
        properties: {
          amenity_id: {
            type: "string",
            description: "The amenity ID to search for",
          },
        },
        required: ["amenity_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_venues_by_tag",
      description: "Find all venues that have a specific tag (cuisine or style). Use list_tags first to get tag IDs.",
      parameters: {
        type: "object",
        properties: {
          tag_id: {
            type: "string",
            description: "The tag ID to search for",
          },
        },
        required: ["tag_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_vendors_by_service",
      description: "Find all vendors that offer a specific service. Use list_vendor_services first to get service IDs.",
      parameters: {
        type: "object",
        properties: {
          service_id: {
            type: "string",
            description: "The vendor service ID to search for",
          },
        },
        required: ["service_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_contacts_for_client",
      description: "Find all contacts linked to a specific client.",
      parameters: {
        type: "object",
        properties: {
          client_id: {
            type: "string",
            description: "The client ID to find contacts for",
          },
        },
        required: ["client_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_contacts_for_vendor",
      description: "Find all contacts linked to a specific vendor.",
      parameters: {
        type: "object",
        properties: {
          vendor_id: {
            type: "string",
            description: "The vendor ID to find contacts for",
          },
        },
        required: ["vendor_id"],
      },
    },
  },
];

async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  permissionContext: PermissionContext | undefined,
  userId: string | undefined,
  req: Request
): Promise<string> {
  try {
    switch (toolName) {
      case "search_venues": {
        if (!checkPermissionDirect(permissionContext, "venues.read")) {
          return JSON.stringify({ error: "You don't have permission to search venues" });
        }
        const query = (args.query as string).toLowerCase();
        const allVenues = await venuesStorage.getVenuesWithRelations();
        const matches = allVenues
          .filter((v) => v.name.toLowerCase().includes(query))
          .slice(0, 5)
          .map((v) => ({
            id: v.id,
            name: v.name,
            city: v.city,
            state: v.state,
          }));
        return JSON.stringify({ venues: matches, count: matches.length });
      }

      case "get_venue_details": {
        if (!checkPermissionDirect(permissionContext, "venues.read")) {
          return JSON.stringify({ error: "You don't have permission to view venues" });
        }
        const venue = await venuesStorage.getVenueByIdWithRelations(args.venue_id as string);
        if (!venue) {
          return JSON.stringify({ error: "Venue not found" });
        }
        return JSON.stringify({
          id: venue.id,
          name: venue.name,
          streetAddress1: venue.streetAddress1,
          city: venue.city,
          state: venue.state,
          shortDescription: venue.shortDescription,
          longDescription: venue.longDescription,
          website: venue.website,
          phone: venue.phone,
          venueType: venue.venueType,
          amenities: venue.amenities?.map((a) => ({ id: a.id, name: a.name, icon: a.icon })),
          cuisineTags: venue.cuisineTags?.map((t) => ({ id: t.id, name: t.name })),
          styleTags: venue.styleTags?.map((t) => ({ id: t.id, name: t.name })),
          photoCount: venue.photos?.length || 0,
          floorplanCount: venue.floorplans?.length || 0,
          link: `/venues/${venue.id}`,
        });
      }


      case "update_venue_description": {
        if (!checkPermissionDirect(permissionContext, "venues.write")) {
          return JSON.stringify({ error: "You don't have permission to update venues" });
        }
        const venueId = args.venue_id as string;
        const description = args.description as string;

        const venue = await venuesStorage.updateVenue(venueId, {
          longDescription: description,
        });

        if (!venue) {
          return JSON.stringify({ error: "Failed to update venue" });
        }

        if (userId) {
          await logAuditEvent(req, {
            action: "update",
            entityType: "venue",
            entityId: venueId,
            metadata: { field: "longDescription", source: "ai_agent" },
          });
        }

        return JSON.stringify({
          success: true,
          venueId: venue.id,
          venueName: venue.name,
          link: `/venues/${venue.id}`,
        });
      }

      case "search_clients": {
        if (!checkPermissionDirect(permissionContext, "clients.read")) {
          return JSON.stringify({ error: "You don't have permission to search clients" });
        }
        const query = (args.query as string).toLowerCase();
        const allClients = await clientsStorage.getClients();
        const matches = allClients
          .filter((c) => c.name.toLowerCase().includes(query))
          .slice(0, 10)
          .map((c) => ({
            id: c.id,
            name: c.name,
          }));
        return JSON.stringify({ clients: matches, count: matches.length });
      }

      case "get_client_details": {
        if (!checkPermissionDirect(permissionContext, "clients.read")) {
          return JSON.stringify({ error: "You don't have permission to view clients" });
        }
        const client = await clientsStorage.getClientByIdWithRelations(args.client_id as string);
        if (!client) {
          return JSON.stringify({ error: "Client not found" });
        }
        return JSON.stringify({
          id: client.id,
          name: client.name,
          website: client.website,
          contacts: client.contacts?.map((c) => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`.trim(),
            email: c.emailAddresses?.[0] || null,
            title: c.jobTitle,
          })),
          link: `/clients/${client.id}`,
        });
      }

      case "search_vendors": {
        if (!checkPermissionDirect(permissionContext, "vendors.read")) {
          return JSON.stringify({ error: "You don't have permission to search vendors" });
        }
        const query = (args.query as string).toLowerCase();
        const allVendors = await vendorsStorage.getVendorsWithRelations();
        const matches = allVendors
          .filter((v) => v.businessName.toLowerCase().includes(query))
          .slice(0, 10)
          .map((v) => ({
            id: v.id,
            name: v.businessName,
            website: v.website,
            services: v.services?.map((s) => s.name),
          }));
        return JSON.stringify({ vendors: matches, count: matches.length });
      }

      case "get_vendor_details": {
        if (!checkPermissionDirect(permissionContext, "vendors.read")) {
          return JSON.stringify({ error: "You don't have permission to view vendors" });
        }
        const vendor = await vendorsStorage.getVendorByIdWithRelations(args.vendor_id as string);
        if (!vendor) {
          return JSON.stringify({ error: "Vendor not found" });
        }
        return JSON.stringify({
          id: vendor.id,
          name: vendor.businessName,
          website: vendor.website,
          email: vendor.email,
          phone: vendor.phone,
          notes: vendor.notes,
          services: vendor.services?.map((s) => s.name),
          contacts: vendor.contacts?.map((c) => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`.trim(),
            email: c.emailAddresses?.[0] || null,
            title: c.jobTitle,
          })),
          link: `/vendors/${vendor.id}`,
        });
      }

      case "search_deals": {
        if (!checkPermissionDirect(permissionContext, "deals.read")) {
          return JSON.stringify({ error: "You don't have permission to search deals" });
        }
        const query = args.query as string | undefined;
        const statusFilter = args.status as string | undefined;
        
        let deals = await storage.getDeals(
          statusFilter ? { status: [statusFilter as any] } : undefined
        );
        
        if (query) {
          const lowerQuery = query.toLowerCase();
          deals = deals.filter((d) => d.displayName.toLowerCase().includes(lowerQuery));
        }
        
        const matches = deals.slice(0, 10).map((d) => ({
          id: d.id,
          name: d.displayName,
          dealNumber: d.dealNumber,
          client: d.client?.name,
          status: d.status,
          budgetRange: d.budgetLow && d.budgetHigh 
            ? `$${d.budgetLow.toLocaleString()} - $${d.budgetHigh.toLocaleString()}`
            : null,
        }));
        return JSON.stringify({ deals: matches, count: matches.length });
      }

      case "get_deal_details": {
        if (!checkPermissionDirect(permissionContext, "deals.read")) {
          return JSON.stringify({ error: "You don't have permission to view deals" });
        }
        const deal = await storage.getDealById(args.deal_id as string);
        if (!deal) {
          return JSON.stringify({ error: "Deal not found" });
        }
        return JSON.stringify({
          id: deal.id,
          name: deal.displayName,
          dealNumber: deal.dealNumber,
          client: deal.client?.name,
          primaryContact: deal.primaryContact 
            ? `${deal.primaryContact.firstName} ${deal.primaryContact.lastName}`.trim()
            : null,
          status: deal.status,
          budgetLow: deal.budgetLow,
          budgetHigh: deal.budgetHigh,
          budgetNotes: deal.budgetNotes,
          concept: deal.concept,
          notes: deal.notes,
          link: `/deals/${deal.id}`,
        });
      }

      case "list_amenities": {
        const amenities = await referenceDataStorage.getAmenities();
        return JSON.stringify({
          amenities: amenities.map((a) => ({
            id: a.id,
            name: a.name,
            icon: a.icon,
          })),
          count: amenities.length,
        });
      }

      case "list_tags": {
        const category = args.category as string | undefined;
        const allTags = await referenceDataStorage.getTags();
        const filtered = category 
          ? allTags.filter((t) => t.category === category)
          : allTags;
        return JSON.stringify({
          tags: filtered.map((t) => ({
            id: t.id,
            name: t.name,
            category: t.category,
          })),
          count: filtered.length,
        });
      }

      case "list_industries": {
        const industries = await referenceDataStorage.getIndustries();
        return JSON.stringify({
          industries: industries.map((i) => ({
            id: i.id,
            name: i.name,
          })),
          count: industries.length,
        });
      }

      case "list_vendor_services": {
        const services = await vendorsStorage.getVendorServices();
        return JSON.stringify({
          services: services.map((s) => ({
            id: s.id,
            name: s.name,
          })),
          count: services.length,
        });
      }

      case "list_deal_services": {
        const services = await referenceDataStorage.getDealServices();
        return JSON.stringify({
          services: services.map((s) => ({
            id: s.id,
            name: s.name,
          })),
          count: services.length,
        });
      }

      case "find_venues_by_amenity": {
        if (!checkPermissionDirect(permissionContext, "venues.read")) {
          return JSON.stringify({ error: "You don't have permission to view venues" });
        }
        const amenityId = args.amenity_id as string;
        const venuesList = await venuesStorage.getVenuesByAmenityId(amenityId);
        return JSON.stringify({
          venues: venuesList.map((v) => ({
            id: v.id,
            name: v.name,
            city: v.city,
            state: v.state,
            link: `/venues/${v.id}`,
          })),
          count: venuesList.length,
        });
      }

      case "find_venues_by_tag": {
        if (!checkPermissionDirect(permissionContext, "venues.read")) {
          return JSON.stringify({ error: "You don't have permission to view venues" });
        }
        const tagId = args.tag_id as string;
        const venuesList = await venuesStorage.getVenuesByTagId(tagId);
        return JSON.stringify({
          venues: venuesList.map((v) => ({
            id: v.id,
            name: v.name,
            city: v.city,
            state: v.state,
            link: `/venues/${v.id}`,
          })),
          count: venuesList.length,
        });
      }

      case "find_vendors_by_service": {
        if (!checkPermissionDirect(permissionContext, "vendors.read")) {
          return JSON.stringify({ error: "You don't have permission to view vendors" });
        }
        const serviceId = args.service_id as string;
        const vendorsList = await vendorsStorage.getVendorsByServiceId(serviceId);
        return JSON.stringify({
          vendors: vendorsList.map((v) => ({
            id: v.id,
            name: v.businessName,
            email: v.email,
            link: `/vendors/${v.id}`,
          })),
          count: vendorsList.length,
        });
      }

      case "find_contacts_for_client": {
        if (!checkPermissionDirect(permissionContext, "clients.read")) {
          return JSON.stringify({ error: "You don't have permission to view clients" });
        }
        const clientId = args.client_id as string;
        const contactsList = await clientsStorage.getContactsForClient(clientId);
        return JSON.stringify({
          contacts: contactsList.map((c) => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`.trim(),
            email: c.emailAddresses?.[0] || null,
            title: c.jobTitle,
            link: `/contacts/${c.id}`,
          })),
          count: contactsList.length,
        });
      }

      case "find_contacts_for_vendor": {
        if (!checkPermissionDirect(permissionContext, "vendors.read")) {
          return JSON.stringify({ error: "You don't have permission to view vendors" });
        }
        const vendorId = args.vendor_id as string;
        const contactsList = await vendorsStorage.getContactsForVendor(vendorId);
        return JSON.stringify({
          contacts: contactsList.map((c) => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`.trim(),
            email: c.emailAddresses?.[0] || null,
            title: c.jobTitle,
            link: `/contacts/${c.id}`,
          })),
          count: contactsList.length,
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error);
    return JSON.stringify({ error: `Tool execution failed: ${error instanceof Error ? error.message : "Unknown error"}` });
  }
}

function checkPermissionDirect(
  context: PermissionContext | undefined,
  permission: string
): boolean {
  if (!context) return false;
  return context.permissions.includes(permission as any);
}

export function registerAiChatRoutes(app: Express) {
  app.post("/api/ai/chat", loadPermissions, async (req: Request, res: Response) => {
    const permissionContext = req.permissionContext;
    const userId = req.userId;

    if (!permissionContext) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userTier = permissionContext.tier;
    if (userTier < 2) {
      return res.status(403).json({ 
        message: "AI chat is only available for admin and manager users" 
      });
    }

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: "Messages array is required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      const fullMessages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ];

      let continueLoop = true;

      while (continueLoop) {
        const response = await openai.chat.completions.create({
          model: "gpt-5.2",
          messages: fullMessages,
          tools,
          tool_choice: "auto",
          stream: true,
        });

        let currentToolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map();
        let assistantContent = "";

        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta;
          
          if (delta?.content) {
            assistantContent += delta.content;
            res.write(`data: ${JSON.stringify({ type: "content", content: delta.content })}\n\n`);
          }

          if (delta?.tool_calls) {
            for (const toolCall of delta.tool_calls) {
              const index = toolCall.index;
              if (!currentToolCalls.has(index)) {
                currentToolCalls.set(index, {
                  id: toolCall.id || "",
                  name: toolCall.function?.name || "",
                  arguments: "",
                });
              }
              const existing = currentToolCalls.get(index)!;
              if (toolCall.id) existing.id = toolCall.id;
              if (toolCall.function?.name) existing.name = toolCall.function.name;
              if (toolCall.function?.arguments) existing.arguments += toolCall.function.arguments;
            }
          }
        }

        if (currentToolCalls.size > 0) {
          const toolCallsArray = Array.from(currentToolCalls.values());
          
          fullMessages.push({
            role: "assistant",
            content: assistantContent || null,
            tool_calls: toolCallsArray.map((tc) => ({
              id: tc.id,
              type: "function" as const,
              function: { name: tc.name, arguments: tc.arguments },
            })),
          });

          for (const toolCall of toolCallsArray) {
            res.write(`data: ${JSON.stringify({ 
              type: "tool_call", 
              name: toolCall.name,
              arguments: JSON.parse(toolCall.arguments || "{}"),
            })}\n\n`);

            const result = await executeToolCall(
              toolCall.name,
              JSON.parse(toolCall.arguments || "{}"),
              permissionContext,
              userId,
              req
            );

            res.write(`data: ${JSON.stringify({ 
              type: "tool_result", 
              name: toolCall.name,
              result: JSON.parse(result),
            })}\n\n`);

            fullMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: result,
            });
          }
        } else {
          continueLoop = false;
        }
      }

      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    } catch (error) {
      console.error("AI chat error:", error);
      res.write(`data: ${JSON.stringify({ type: "error", message: "An error occurred" })}\n\n`);
      res.end();
    }
  });
}
