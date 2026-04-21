import type { Request, Response, NextFunction } from "express";
import { apiKeysStorage, hashApiKey } from "../domains/api-keys/api-keys.storage";
import { updateRequestContext } from "../lib/request-context";

const REPLIT_AGENT_USER_ID = "replit-agent";

export interface McpActor {
  id: string;
  source: "agent_shared" | "personal";
  apiKeyId?: string;
  bucketKey: string;
}

export function getReplitAgentUserId(): string {
  return REPLIT_AGENT_USER_ID;
}

export async function mcpBearerAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const agentApiKey = process.env.AGENT_API_KEY;

  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  }
  if (!token && req.query.token) {
    token = String(req.query.token).trim();
  }

  if (!token) {
    if (!agentApiKey && process.env.NODE_ENV !== "production") {
      const actor: McpActor = {
        id: REPLIT_AGENT_USER_ID,
        source: "agent_shared",
        bucketKey: "dev:no-auth",
      };
      (req as any).mcpActor = actor;
      updateRequestContext({ userId: actor.id, source: "mcp" });
      return next();
    }
    res.status(401).json({ error: "Missing authorization. Provide a Bearer token header or ?token= query parameter." });
    return;
  }

  if (agentApiKey && token === agentApiKey) {
    const actor: McpActor = {
      id: REPLIT_AGENT_USER_ID,
      source: "agent_shared",
      bucketKey: "agent:shared",
    };
    (req as any).mcpActor = actor;
    updateRequestContext({ userId: actor.id, source: "mcp" });
    return next();
  }

  try {
    const hash = hashApiKey(token);
    const key = await apiKeysStorage.getActiveByHash(hash);
    if (!key) {
      res.status(403).json({ error: "Invalid or revoked API key" });
      return;
    }
    const actor: McpActor = {
      id: key.userId,
      source: "personal",
      apiKeyId: key.id,
      bucketKey: `key:${key.id}`,
    };
    (req as any).mcpActor = actor;
    updateRequestContext({ userId: actor.id, source: "mcp" });
    apiKeysStorage.markUsed(key.id).catch((err) => {
      console.error("[MCP] Failed to mark API key used:", err);
    });
    return next();
  } catch (error) {
    console.error("[MCP] Auth lookup failed:", error);
    res.status(500).json({ error: "Authentication failed" });
    return;
  }
}
