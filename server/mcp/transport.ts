import { Router, Request, Response, NextFunction } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { randomUUID, randomBytes } from "crypto";
import { createMcpServer } from "./index";
import { mcpRateLimit, getRateLimitStats } from "./rate-limit";

const router = Router();

function mcpBearerAuth(req: Request, res: Response, next: NextFunction): void {
  const agentApiKey = process.env.AGENT_API_KEY;
  if (!agentApiKey) {
    if (process.env.NODE_ENV === "production") {
      res.status(503).json({ error: "MCP server not configured: AGENT_API_KEY is required in production" });
      return;
    }
    next();
    return;
  }

  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    res.status(401).json({ error: "Missing authorization. Provide Bearer token header or ?token= query parameter" });
    return;
  }

  if (token !== agentApiKey) {
    res.status(403).json({ error: "Invalid API key" });
    return;
  }

  next();
}

router.use(mcpBearerAuth);
router.use(mcpRateLimit);

let mcpServerPromise: Promise<McpServer> | null = null;

async function getMcpServer() {
  if (!mcpServerPromise) {
    mcpServerPromise = createMcpServer();
  }
  return mcpServerPromise;
}

const sseTransports = new Map<string, SSEServerTransport>();
const httpSessions = new Map<string, StreamableHTTPServerTransport>();

function generateSecureSessionId(): string {
  return randomBytes(32).toString("hex");
}

router.get("/sse", async (_req: Request, res: Response) => {
  const mcpServer = await getMcpServer();
  const sessionId = generateSecureSessionId();

  console.log(`[MCP] New SSE connection: ${sessionId.substring(0, 8)}...`);

  res.setHeader("X-Session-Id", sessionId);

  const transport = new SSEServerTransport("/api/mcp/message", res);
  sseTransports.set(sessionId, transport);

  res.on("close", () => {
    console.log(`[MCP] SSE connection closed: ${sessionId.substring(0, 8)}...`);
    sseTransports.delete(sessionId);
  });

  await mcpServer.connect(transport);
});

router.post("/message", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    return res.status(400).json({ error: "Missing sessionId parameter" });
  }

  const transport = sseTransports.get(sessionId);
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

router.post("/", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && httpSessions.has(sessionId)) {
    const transport = httpSessions.get(sessionId)!;
    try {
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("[MCP] Error handling request:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to process request" });
      }
    }
    return;
  }

  if (sessionId && !httpSessions.has(sessionId)) {
    res.status(404).json({ error: "Session not found. Create a new session by sending an initialize request without a session ID." });
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  const mcpServer = await getMcpServer();
  await mcpServer.connect(transport);

  try {
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("[MCP] Error handling initial request:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to process request" });
    }
    return;
  }

  const sid = transport.sessionId;
  if (sid) {
    httpSessions.set(sid, transport);
    console.log(`[MCP] New Streamable HTTP session: ${sid.substring(0, 8)}...`);

    transport.onclose = () => {
      console.log(`[MCP] Session closed: ${sid.substring(0, 8)}...`);
      httpSessions.delete(sid);
    };
  }
});

router.get("/", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId || !httpSessions.has(sessionId)) {
    res.status(400).json({ error: "Missing or invalid mcp-session-id header. Initialize a session first via POST." });
    return;
  }

  const transport = httpSessions.get(sessionId)!;
  try {
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("[MCP] Error handling GET stream:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to open stream" });
    }
  }
});

router.delete("/", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId || !httpSessions.has(sessionId)) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const transport = httpSessions.get(sessionId)!;
  try {
    await transport.close();
    httpSessions.delete(sessionId);
    res.status(200).json({ message: "Session terminated" });
  } catch (error) {
    console.error("[MCP] Error closing session:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to close session" });
    }
  }
});

router.get("/health", (_req: Request, res: Response) => {
  const rateLimitStats = getRateLimitStats();
  return res.json({
    status: "healthy",
    server: "coca-mcp-server",
    version: "1.0.0",
    transports: ["sse", "streamable-http"],
    activeSessions: {
      sse: sseTransports.size,
      streamableHttp: httpSessions.size,
    },
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
      { name: "features_list", description: "List and filter feature requests by status and/or category", category: "features", riskLevel: "low" },
      { name: "features_get", description: "Get detailed information about a specific feature including comments", category: "features", riskLevel: "low" },
      { name: "features_update", description: "Update a feature's status, priority, title, or description", category: "features", riskLevel: "medium" },
      { name: "features_add_comment", description: "Post a comment to a feature using the Replit Agent user", category: "features", riskLevel: "medium" },
      { name: "features_list_categories", description: "List available feature categories with IDs and names", category: "features", riskLevel: "low" },
    ];
    
    return res.json({
      protocol: "MCP",
      version: "1.0.0",
      tools: toolList,
      endpoints: {
        sse: "/api/mcp/sse",
        message: "/api/mcp/message",
        streamableHttp: "/api/mcp",
        health: "/api/mcp/health",
      },
    });
  } catch (error) {
    console.error("[MCP] Error listing tools:", error);
    return res.status(500).json({ error: "Failed to list tools" });
  }
});

export default router;
