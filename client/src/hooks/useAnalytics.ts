import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";

const ANALYTICS_SESSION_KEY = "analytics_session_token";
const ANALYTICS_SESSION_ID_KEY = "analytics_session_id";
const DEBOUNCE_MS = 100;

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

function sendDurationBeacon(pageViewId: string, durationMs: number): void {
  const url = `/api/activity/pageview/${pageViewId}/duration`;
  const data = JSON.stringify({ durationMs });
  
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, data);
  } else {
    fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: data,
      keepalive: true,
    }).catch(() => {});
  }
}

function initSession(): void {
  const sessionToken = sessionStorage.getItem(ANALYTICS_SESSION_KEY);
  const sessionId = sessionStorage.getItem(ANALYTICS_SESSION_ID_KEY);
  
  if (sessionToken && sessionId) {
    fetch("/api/activity/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken,
        userAgent: navigator.userAgent,
        deviceType: getDeviceType(),
        environment: getEnvironment(),
      }),
    }).catch(() => {});
    return;
  }

  const newToken = generateSessionToken();
  sessionStorage.setItem(ANALYTICS_SESSION_KEY, newToken);

  fetch("/api/activity/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionToken: newToken,
      userAgent: navigator.userAgent,
      deviceType: getDeviceType(),
      environment: getEnvironment(),
    }),
  })
    .then((res) => res.ok ? res.json() : null)
    .then((session) => {
      if (session?.id) {
        sessionStorage.setItem(ANALYTICS_SESSION_ID_KEY, session.id);
      }
    })
    .catch(() => {});
}

function getSessionId(): string {
  return sessionStorage.getItem(ANALYTICS_SESSION_ID_KEY) || "";
}

export function useAnalytics() {
  const [location] = useLocation();
  const currentPageViewRef = useRef<{ id: string; startTime: number } | null>(null);
  const lastPathRef = useRef<string>("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionInitializedRef = useRef(false);

  const trackPageView = useCallback((path: string) => {
    if (path === lastPathRef.current) return;
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (path === lastPathRef.current) return;
      
      if (currentPageViewRef.current) {
        const duration = Date.now() - currentPageViewRef.current.startTime;
        sendDurationBeacon(currentPageViewRef.current.id, duration);
        currentPageViewRef.current = null;
      }

      lastPathRef.current = path;

      if (!sessionInitializedRef.current) {
        initSession();
        sessionInitializedRef.current = true;
      }

      fetch("/api/activity/pageview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId() || null,
          path,
          title: document.title,
          referrer: document.referrer,
          environment: getEnvironment(),
        }),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((pageView) => {
          if (pageView?.id) {
            currentPageViewRef.current = { id: pageView.id, startTime: Date.now() };
          }
        })
        .catch(() => {});
    }, DEBOUNCE_MS);
  }, []);

  const trackEvent = useCallback((
    eventType: string,
    eventName: string,
    options?: {
      eventCategory?: string;
      elementId?: string;
      metadata?: Record<string, unknown>;
    }
  ) => {
    if (!sessionInitializedRef.current) {
      initSession();
      sessionInitializedRef.current = true;
    }

    fetch("/api/activity/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getSessionId() || null,
        eventType,
        eventName,
        eventCategory: options?.eventCategory,
        path: window.location.pathname,
        elementId: options?.elementId,
        metadata: options?.metadata,
        environment: getEnvironment(),
      }),
    }).catch(() => {});
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
        sendDurationBeacon(currentPageViewRef.current.id, duration);
      }
      const sessionId = getSessionId();
      if (sessionId) {
        navigator.sendBeacon(`/api/activity/session/${sessionId}/end`, "");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return { trackEvent, trackClick, trackPageView };
}

export function useTrackClick() {
  const { trackClick } = useAnalytics();
  return trackClick;
}
