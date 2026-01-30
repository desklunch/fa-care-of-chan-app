import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { loadPermissions, checkPermission } from "../../middleware/permissions";
import { venuesStorage } from "../venues/venues.storage";
import { logAuditEvent } from "../../audit";
import type { PermissionContext } from "../../../shared/permissions";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SYSTEM_PROMPT = `You are a helpful AI assistant for Care of Chan OS, an enterprise management system for managing venues, vendors, contacts, and deals.

Your primary capability right now is helping users generate editorial descriptions for venues.

WORKFLOW:
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
        const venue = await venuesStorage.getVenueById(args.venue_id as string);
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
