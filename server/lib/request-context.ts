import { AsyncLocalStorage } from "async_hooks";
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

export interface RequestContext {
  requestId: string;
  sessionId: string | null;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  startTime: number;
  source: 'api' | 'mcp' | 'system' | 'event';
}

const requestContext = new AsyncLocalStorage<RequestContext>();

function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(",")[0];
    return ips.trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  const user = req.user as { claims?: { sub?: string }; id?: string } | undefined;
  
  const context: RequestContext = {
    requestId: crypto.randomUUID(),
    sessionId: session?.id || req.sessionID || null,
    userId: user?.claims?.sub || user?.id || null,
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"] || null,
    startTime: Date.now(),
    source: 'api',
  };
  
  requestContext.run(context, next);
}

export function runWithContext<T>(context: Partial<RequestContext>, fn: () => T): T {
  const fullContext: RequestContext = {
    requestId: context.requestId || crypto.randomUUID(),
    sessionId: context.sessionId || null,
    userId: context.userId || null,
    ipAddress: context.ipAddress || null,
    userAgent: context.userAgent || null,
    startTime: context.startTime || Date.now(),
    source: context.source || 'system',
  };
  return requestContext.run(fullContext, fn);
}

export function getRequestContext(): RequestContext | null {
  return requestContext.getStore() || null;
}

export function updateRequestContext(updates: Partial<RequestContext>): void {
  const ctx = requestContext.getStore();
  if (ctx) {
    Object.assign(ctx, updates);
  }
}
