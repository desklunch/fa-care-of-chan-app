import { OAuth2Client } from "google-auth-library";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

async function verifyGoogleToken(idToken: string) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error("Invalid token payload");
  }
  return payload;
}

async function upsertUser(payload: any, inviteToken?: string): Promise<{ user: any; userId: string }> {
  let inviteData = null;
  if (inviteToken) {
    inviteData = await storage.getInviteByToken(inviteToken);
    if (inviteData && !inviteData.usedAt) {
      if (inviteData.email.toLowerCase() === payload.email?.toLowerCase()) {
        await storage.markInviteUsed(inviteData.id);
      } else {
        inviteData = null;
      }
    } else {
      inviteData = null;
    }
  }

  // Check if a user with this email already exists (handles migration from old auth systems)
  const existingUser = await storage.getUserByEmail(payload.email);
  
  if (existingUser) {
    // Update existing user's profile info but keep their original ID
    await storage.updateUser(existingUser.id, {
      firstName: inviteData?.firstName || payload.given_name || existingUser.firstName,
      lastName: inviteData?.lastName || payload.family_name || existingUser.lastName,
      profileImageUrl: payload.picture || existingUser.profileImageUrl,
    });
    const updatedUser = await storage.getUser(existingUser.id);
    return { user: updatedUser, userId: existingUser.id };
  }

  // No existing user, create new one with Google's sub as ID
  await storage.upsertUser({
    id: payload.sub,
    email: payload.email,
    firstName: inviteData?.firstName || payload.given_name,
    lastName: inviteData?.lastName || payload.family_name,
    profileImageUrl: payload.picture,
  });

  const newUser = await storage.getUser(payload.sub);
  return { user: newUser, userId: payload.sub };
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/auth/google", async (req, res) => {
    try {
      const { credential, inviteToken } = req.body;
      
      if (!credential) {
        return res.status(400).json({ message: "No credential provided" });
      }

      const payload = await verifyGoogleToken(credential);
      
      const email = payload.email?.toLowerCase();
      const allowedEmails = ["omar@functionalartists.ai"];
      const isAllowedDomain = email?.endsWith("@careofchan.com");
      const isAllowedException = allowedEmails.includes(email || "");
      
      if (!email || (!isAllowedDomain && !isAllowedException)) {
        return res.status(403).json({ 
          message: "Access denied",
          reason: "domain",
          detail: "Only @careofchan.com email addresses are allowed"
        });
      }

      const { user, userId } = await upsertUser(payload, inviteToken);
      
      // Use the actual user ID (which may be different from Google's sub for migrated accounts)
      (req.session as any).userId = userId;
      (req.session as any).email = payload.email;
      (req.session as any).claims = {
        sub: userId, // Use the actual user ID for consistency
        email: payload.email,
        given_name: payload.given_name,
        family_name: payload.family_name,
        picture: payload.picture,
      };

      res.json({ success: true, user });
    } catch (error: any) {
      console.error("Google auth error:", error);
      res.status(401).json({ message: "Authentication failed", error: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/session", (req, res) => {
    const session = req.session as any;
    if (session?.userId) {
      res.json({ 
        authenticated: true, 
        userId: session.userId,
        email: session.email 
      });
    } else {
      res.json({ authenticated: false });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const session = req.session as any;
  
  if (!session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  (req as any).user = {
    claims: session.claims
  };
  
  next();
};

export const isAdmin: RequestHandler = async (req, res, next) => {
  const session = req.session as any;
  if (!session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = await storage.getUser(session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  
  next();
};
