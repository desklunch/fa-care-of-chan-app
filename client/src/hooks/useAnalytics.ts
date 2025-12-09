import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";

const ANALYTICS_SESSION_KEY = "analytics_session_token";
const ANALYTICS_SESSION_ID_KEY = "analytics_session_id";

function generateSessionToken(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}

function getEnvironment(): string {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.includes(".replit.dev")) {
    return "development";
  }
  return "production";
}

async function createOrGetSession(): Promise<{ sessionId: string; sessionToken: string }> {
  let sessionToken = sessionStorage.getItem(ANALYTICS_SESSION_KEY);
  let sessionId = sessionStorage.getItem(ANALYTICS_SESSION_ID_KEY);
  const environment = getEnvironment();

  if (sessionToken && sessionId) {
    try {
      const res = await fetch("/api/analytics/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          userAgent: navigator.userAgent,
          deviceType: getDeviceType(),
          environment,
        }),
      });
      if (res.ok) {
        const session = await res.json();
        return { sessionId: session.id, sessionToken };
      }
    } catch (e) {
      console.error("Failed to update session:", e);
    }
  }

  sessionToken = generateSessionToken();
  sessionStorage.setItem(ANALYTICS_SESSION_KEY, sessionToken);

  try {
    const res = await fetch("/api/analytics/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken,
        userAgent: navigator.userAgent,
        deviceType: getDeviceType(),
        environment,
      }),
    });
    if (res.ok) {
      const session = await res.json();
      sessionStorage.setItem(ANALYTICS_SESSION_ID_KEY, session.id);
      return { sessionId: session.id, sessionToken };
    }
  } catch (e) {
    console.error("Failed to create session:", e);
  }

  return { sessionId: "", sessionToken };
}

export function useAnalytics() {
  const [location] = useLocation();
  const sessionRef = useRef<{ sessionId: string; sessionToken: string } | null>(null);
  const currentPageViewRef = useRef<{ id: string; startTime: number } | null>(null);
  const lastPathRef = useRef<string>("");

  const trackPageView = useCallback(async (path: string) => {
    if (path === lastPathRef.current) return;
    lastPathRef.current = path;

    if (currentPageViewRef.current) {
      const duration = Date.now() - currentPageViewRef.current.startTime;
      try {
        await fetch(`/api/analytics/pageview/${currentPageViewRef.current.id}/duration`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ durationMs: duration }),
        });
      } catch (e) {
        // Ignore errors for duration updates
      }
    }

    if (!sessionRef.current) {
      sessionRef.current = await createOrGetSession();
    }

    try {
      const res = await fetch("/api/analytics/pageview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionRef.current.sessionId || null,
          path,
          title: document.title,
          referrer: document.referrer,
          environment: getEnvironment(),
        }),
      });
      if (res.ok) {
        const pageView = await res.json();
        currentPageViewRef.current = { id: pageView.id, startTime: Date.now() };
      }
    } catch (e) {
      console.error("Failed to track page view:", e);
    }
  }, []);

  const trackEvent = useCallback(async (
    eventType: string,
    eventName: string,
    options?: {
      eventCategory?: string;
      elementId?: string;
      metadata?: Record<string, unknown>;
    }
  ) => {
    if (!sessionRef.current) {
      sessionRef.current = await createOrGetSession();
    }

    try {
      await fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionRef.current.sessionId || null,
          eventType,
          eventName,
          eventCategory: options?.eventCategory,
          path: window.location.pathname,
          elementId: options?.elementId,
          metadata: options?.metadata,
          environment: getEnvironment(),
        }),
      });
    } catch (e) {
      console.error("Failed to track event:", e);
    }
  }, []);

  const trackClick = useCallback((eventName: string, elementId?: string, metadata?: Record<string, unknown>) => {
    trackEvent("click", eventName, { eventCategory: "engagement", elementId, metadata });
  }, [trackEvent]);

  useEffect(() => {
    trackPageView(location);
  }, [location, trackPageView]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentPageViewRef.current) {
        const duration = Date.now() - currentPageViewRef.current.startTime;
        navigator.sendBeacon(
          `/api/analytics/pageview/${currentPageViewRef.current.id}/duration`,
          JSON.stringify({ durationMs: duration })
        );
      }
      if (sessionRef.current?.sessionId) {
        navigator.sendBeacon(
          `/api/analytics/session/${sessionRef.current.sessionId}/end`,
          ""
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return { trackEvent, trackClick, trackPageView };
}

export function useTrackClick() {
  const { trackClick } = useAnalytics();
  return trackClick;
}
