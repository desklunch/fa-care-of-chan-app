import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(compression());

app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

function summarizeResponse(body: any): string {
  if (body === null || body === undefined) return "null";
  if (Array.isArray(body)) {
    return `[Array: ${body.length} items]`;
  }
  if (typeof body === "object") {
    const keys = Object.keys(body);
    if (keys.length <= 3) {
      const preview: Record<string, any> = {};
      for (const key of keys) {
        const val = body[key];
        if (Array.isArray(val)) {
          preview[key] = `[${val.length} items]`;
        } else if (typeof val === "object" && val !== null) {
          preview[key] = "{...}";
        } else if (typeof val === "string" && val.length > 50) {
          preview[key] = val.substring(0, 50) + "...";
        } else {
          preview[key] = val;
        }
      }
      return JSON.stringify(preview);
    }
    return `{${keys.length} keys: ${keys.slice(0, 4).join(", ")}${keys.length > 4 ? "..." : ""}}`;
  }
  return String(body).substring(0, 100);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${summarizeResponse(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  
  // Configure HTTP keep-alive timeouts to prevent stale connection issues.
  // Default Node.js keepAliveTimeout is only 5 seconds, which causes connections
  // to close quickly and leads to failed requests when browser reuses stale connections.
  // Setting to 61s ensures connections stay open longer than typical load balancer timeouts.
  httpServer.keepAliveTimeout = 61 * 1000; // 61 seconds
  httpServer.headersTimeout = 65 * 1000;   // 65 seconds (must be > keepAliveTimeout)
  
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      log(`keepAliveTimeout: ${httpServer.keepAliveTimeout}ms, headersTimeout: ${httpServer.headersTimeout}ms`);
    },
  );
})();
