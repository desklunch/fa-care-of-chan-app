import { doubleCsrf } from "csrf-csrf";
import cookieParser from "cookie-parser";
import type { Request, Response, NextFunction, Express } from "express";

const CSRF_SECRET = process.env.SESSION_SECRET || "csrf-secret-fallback";

const EXCLUDED_PATHS = [
  "/api/auth/callback",
  "/api/auth/replit/callback", 
  "/api/auth/google/callback",
  "/api/auth/google",  // Google OAuth login endpoint (pre-auth, no CSRF needed)
  "/api/auth/dev-login",
  "/api/activity/",
  "/api/places/",
  "/api/ai/",  // AI chat uses SSE streaming with session auth
  "/api/webhooks/",
  "/api/mcp",  // MCP server uses bearer token auth, not session-based CSRF
];

const {
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  getSessionIdentifier: (req: Request) => {
    const session = (req as any).session;
    if (!session?.id) {
      throw new Error("CSRF_NO_SESSION");
    }
    return session.id;
  },
  cookieName: "x-csrf-token",
  cookieOptions: {
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    path: "/",
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getCsrfTokenFromRequest: (req: Request) => {
    return req.headers["x-csrf-token"] as string;
  },
});

function shouldSkipCsrf(req: Request): boolean {
  if (EXCLUDED_PATHS.some(path => req.path.startsWith(path))) {
    return true;
  }
  
  if (!req.path.startsWith("/api/")) {
    return true;
  }
  
  const session = (req as any).session;
  if (!session?.id) {
    return true;
  }
  
  return false;
}

function isAuthenticated(req: Request): boolean {
  const session = (req as any).session;
  return !!(session?.userId);
}

export function csrfProtectionMiddleware(req: Request, res: Response, next: NextFunction) {
  if (shouldSkipCsrf(req)) {
    return next();
  }
  
  return doubleCsrfProtection(req, res, next);
}

export function csrfTokenEndpoint(req: Request, res: Response) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  try {
    const token = generateCsrfToken(req, res);
    res.json({ csrfToken: token });
  } catch (error) {
    console.error("Failed to generate CSRF token:", error);
    res.status(500).json({ message: "Failed to generate CSRF token" });
  }
}

export function setupCsrf(app: Express) {
  app.use(cookieParser());
  
  app.get("/api/csrf-token", csrfTokenEndpoint);
  
  app.use(csrfProtectionMiddleware);
}

export { generateCsrfToken };
