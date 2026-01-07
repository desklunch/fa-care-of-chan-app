import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 100;

export function mcpRateLimit(req: Request, res: Response, next: NextFunction): void {
  const clientId = (req.user as { id?: string })?.id || req.ip || "anonymous";
  const now = Date.now();
  
  let entry = rateLimitStore.get(clientId);
  
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    rateLimitStore.set(clientId, entry);
  }
  
  entry.count++;
  
  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
  res.setHeader("X-RateLimit-Remaining", remaining);
  res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));
  
  if (entry.count > MAX_REQUESTS) {
    res.status(429).json({
      error: "Too many requests",
      message: `Rate limit exceeded. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    });
    return;
  }
  
  next();
}

setInterval(() => {
  const now = Date.now();
  Array.from(rateLimitStore.entries()).forEach(([key, entry]) => {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  });
}, 60 * 1000);

export function getRateLimitStats(): { activeClients: number; totalRequests: number } {
  let totalRequests = 0;
  Array.from(rateLimitStore.values()).forEach((entry) => {
    totalRequests += entry.count;
  });
  return {
    activeClients: rateLimitStore.size,
    totalRequests,
  };
}
