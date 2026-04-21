import crypto from "crypto";
import { db } from "../../db";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { apiKeys, type ApiKey } from "@shared/schema";

export const KEY_PREFIX = "coc_";

export function generateApiKey(): { token: string; hash: string; prefix: string } {
  const random = crypto.randomBytes(32).toString("base64url");
  const token = `${KEY_PREFIX}${random}`;
  const hash = hashApiKey(token);
  const prefix = token.slice(0, 12);
  return { token, hash, prefix };
}

export function hashApiKey(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export class ApiKeysStorage {
  async listForUser(userId: string): Promise<ApiKey[]> {
    return db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt));
  }

  async createForUser(userId: string, label: string): Promise<{ key: ApiKey; token: string }> {
    const { token, hash, prefix } = generateApiKey();
    const [key] = await db
      .insert(apiKeys)
      .values({ userId, label, keyHash: hash, keyPrefix: prefix })
      .returning();
    return { key, token };
  }

  async getActiveByHash(hash: string): Promise<ApiKey | undefined> {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)));
    return key;
  }

  async markUsed(id: string): Promise<void> {
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
  }

  async revoke(id: string, userId: string): Promise<boolean> {
    const result = await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
      .returning({ id: apiKeys.id });
    return result.length > 0;
  }
}

export const apiKeysStorage = new ApiKeysStorage();
