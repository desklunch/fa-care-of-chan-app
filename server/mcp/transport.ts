import { Router, Request, Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { randomBytes } from "crypto";
import { createMcpServer } from "./index";
import { mcpRateLimit, getRateLimitStats } from "./rate-limit";

const router = Router();

router.use(mcpRateLimit);

const mcpServer = createMcpServer();

const transports = new Map<string, SSEServerTransport>();

function generateSecureSessionId(): string {
  return randomBytes(32).toString("hex");
}

router.get("/sse", async (_req: Request, res: Response) => {
  const sessionId = generateSecureSessionId();
  
  console.log(`[MCP] New SSE connection: ${sessionId.substring(0, 8)}...`);
  
  res.setHeader("X-Session-Id", sessionId);
  
  const transport = new SSEServerTransport("/api/mcp/message", res);
  transports.set(sessionId, transport);
  
  res.on("close", () => {
    console.log(`[MCP] SSE connection closed: ${sessionId.substring(0, 8)}...`);
    transports.delete(sessionId);
  });
  
  await mcpServer.connect(transport);
});

router.post("/message", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  
  if (!sessionId) {
    return res.status(400).json({ error: "Missing sessionId parameter" });
  }
  
  const transport = transports.get(sessionId);
  if (!transport) {
    return res.status(404).json({ error: "Session not found" });
  }
  
  try {
    await transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("[MCP] Error handling message:", error);
    return res.status(500).json({ error: "Failed to process message" });
  }
});

router.get("/health", (_req: Request, res: Response) => {
  const rateLimitStats = getRateLimitStats();
  return res.json({
    status: "healthy",
    server: "coca-mcp-server",
    version: "1.0.0",
    activeSessions: transports.size,
    rateLimit: {
      activeClients: rateLimitStats.activeClients,
      totalRequests: rateLimitStats.totalRequests,
      limitPerMinute: 100,
    },
  });
});

router.get("/tools", async (_req: Request, res: Response) => {
  try {
    const toolList = [
      { name: "deals_list", description: "Search and filter deals by status", category: "deals", riskLevel: "low" },
      { name: "deals_get", description: "Get detailed information about a specific deal", category: "deals", riskLevel: "low" },
      { name: "deals_create", description: "Create a new deal in the pipeline", category: "deals", riskLevel: "medium" },
      { name: "deals_update", description: "Update fields on an existing deal", category: "deals", riskLevel: "medium" },
      { name: "deals_move_stage", description: "Move a deal to a different pipeline stage", category: "deals", riskLevel: "medium" },
      { name: "deals_assign_owner", description: "Assign or change the owner of a deal", category: "deals", riskLevel: "medium" },
      { name: "venues_search", description: "Search for venues by name", category: "venues", riskLevel: "low" },
      { name: "venues_get", description: "Get detailed information about a specific venue", category: "venues", riskLevel: "low" },
      { name: "contacts_search", description: "Search for contacts by name or email", category: "contacts", riskLevel: "low" },
      { name: "contacts_get", description: "Get detailed information about a specific contact", category: "contacts", riskLevel: "low" },
      { name: "workspace_summary", description: "Get a summary of the current workspace state", category: "workspace", riskLevel: "low" },
    ];
    
    return res.json({
      protocol: "MCP",
      version: "1.0.0",
      tools: toolList,
      endpoints: {
        sse: "/api/mcp/sse",
        message: "/api/mcp/message",
        health: "/api/mcp/health",
      },
    });
  } catch (error) {
    console.error("[MCP] Error listing tools:", error);
    return res.status(500).json({ error: "Failed to list tools" });
  }
});

export default router;
