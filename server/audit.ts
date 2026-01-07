import { Request } from "express";
import { storage } from "./storage";
import type { AuditAction, AuditEntityType, AuditStatus, AuditSource } from "@shared/schema";
import { getRequestContext } from "./lib/request-context";

interface AuditLogOptions {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  performedBy?: string | null;
  status?: AuditStatus;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  source?: AuditSource;
}

function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor.split(",")[0];
    return ips.trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

const sensitiveFields = [
  "password",
  "token",
  "secret",
  "apikey",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "cookie",
  "session",
];

function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return sensitiveFields.some((field) => lowerKey.includes(field));
}

function deepSanitize(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  
  if (Array.isArray(value)) {
    return value.map(deepSanitize);
  }
  
  if (typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = deepSanitize(val);
      }
    }
    return sanitized;
  }
  
  return value;
}

function sanitizeChanges(
  changes?: AuditLogOptions["changes"]
): Record<string, unknown> | null {
  if (!changes) return null;

  return {
    before: deepSanitize(changes.before) as Record<string, unknown> | undefined,
    after: deepSanitize(changes.after) as Record<string, unknown> | undefined,
  };
}

function sanitizeMetadata(
  metadata?: Record<string, unknown>
): Record<string, unknown> | null {
  if (!metadata) return null;
  return deepSanitize(metadata) as Record<string, unknown>;
}

function getUserId(req: Request): string | null {
  const user = req.user as { claims?: { sub?: string }; id?: string } | undefined;
  return user?.claims?.sub || user?.id || null;
}

export async function logAuditEvent(
  req: Request,
  options: AuditLogOptions
): Promise<void> {
  try {
    const userId = options.performedBy || getUserId(req);
    const ctx = getRequestContext();
    const session = req.session as any;

    await storage.createAuditLog({
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId || null,
      performedBy: userId || null,
      ipAddress: ctx?.ipAddress || getClientIp(req),
      userAgent: ctx?.userAgent || req.headers["user-agent"] || null,
      status: options.status || "success",
      changes: sanitizeChanges(options.changes),
      metadata: sanitizeMetadata(options.metadata),
      sessionId: ctx?.sessionId || session?.id || req.sessionID || null,
      requestId: ctx?.requestId || null,
      durationMs: ctx ? Date.now() - ctx.startTime : null,
      source: options.source || ctx?.source || 'api',
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

export function getChangedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const changedBefore: Record<string, unknown> = {};
  const changedAfter: Record<string, unknown> = {};

  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changedBefore[key] = before[key];
      changedAfter[key] = after[key];
    }
  }

  return { before: changedBefore, after: changedAfter };
}
