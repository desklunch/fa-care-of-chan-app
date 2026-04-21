import type { Express } from "express";
import { isAuthenticated } from "../../googleAuth";
import { apiKeysStorage } from "./api-keys.storage";
import { createApiKeySchema } from "@shared/schema";
import { logAuditEvent } from "../../audit";

function publicView(key: { id: string; label: string; keyPrefix: string; lastUsedAt: Date | null; revokedAt: Date | null; createdAt: Date }) {
  return {
    id: key.id,
    label: key.label,
    keyPrefix: key.keyPrefix,
    lastUsedAt: key.lastUsedAt,
    revokedAt: key.revokedAt,
    createdAt: key.createdAt,
  };
}

export function registerApiKeysRoutes(app: Express): void {
  app.get("/api/profile/api-keys", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const keys = await apiKeysStorage.listForUser(userId);
      res.json(keys.map(publicView));
    } catch (error) {
      console.error("Error listing API keys:", error);
      res.status(500).json({ message: "Failed to list API keys" });
    }
  });

  app.post("/api/profile/api-keys", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = createApiKeySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      }
      const { key, token } = await apiKeysStorage.createForUser(userId, parsed.data.label);
      await logAuditEvent(req, {
        action: "create",
        entityType: "user",
        entityId: key.id,
        metadata: { kind: "api_key", label: key.label, keyPrefix: key.keyPrefix },
      });
      res.status(201).json({ ...publicView(key), token });
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({ message: "Failed to create API key" });
    }
  });

  app.delete("/api/profile/api-keys/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const ok = await apiKeysStorage.revoke(req.params.id, userId);
      if (!ok) {
        return res.status(404).json({ message: "API key not found" });
      }
      await logAuditEvent(req, {
        action: "delete",
        entityType: "user",
        entityId: req.params.id,
        metadata: { kind: "api_key_revoke" },
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error revoking API key:", error);
      res.status(500).json({ message: "Failed to revoke API key" });
    }
  });
}
