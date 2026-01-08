import { useEffect, useRef, useCallback } from "react";
import { queryClient, clearCsrfToken } from "@/lib/queryClient";

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const DEBOUNCE_MS = 500; // Prevent rapid-fire wake-up calls

export function useTabVisibility() {
  const lastActiveRef = useRef<number>(Date.now());
  const lastUserInteractionRef = useRef<number>(Date.now());
  const lastWakeUpRef = useRef<number>(0);
  const wakeUpPendingRef = useRef<boolean>(false);

  const forceRouterSync = useCallback(() => {
    window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
  }, []);

  const handleWakeUp = useCallback((source: string) => {
    const now = Date.now();
    const idleTime = now - lastUserInteractionRef.current;
    const timeSinceLastWakeUp = now - lastWakeUpRef.current;
    
    // Debounce: prevent multiple wake-ups in quick succession (visibility + focus fire together)
    if (timeSinceLastWakeUp < DEBOUNCE_MS) {
      return;
    }
    
    // Prevent concurrent wake-up processing
    if (wakeUpPendingRef.current) {
      return;
    }
    
    if (idleTime > STALE_THRESHOLD_MS) {
      wakeUpPendingRef.current = true;
      lastWakeUpRef.current = now;
      
      console.log(`[AppVisibility] App idle for ${Math.round(idleTime / 1000)}s (${source}), syncing router and invalidating queries`);
      
      // Clear CSRF token to force refresh on next mutation
      clearCsrfToken();
      
      // Sync router first
      forceRouterSync();
      
      // Use requestIdleCallback if available, otherwise setTimeout
      // This prevents blocking the main thread during heavy query invalidation
      const scheduleInvalidation = (callback: () => void) => {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(callback, { timeout: 2000 });
        } else {
          setTimeout(callback, 100);
        }
      };
      
      scheduleInvalidation(() => {
        queryClient.invalidateQueries();
        wakeUpPendingRef.current = false;
      });
    }
    
    lastActiveRef.current = now;
    lastUserInteractionRef.current = now;
  }, [forceRouterSync]);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible") {
      handleWakeUp("visibility");
    }
  }, [handleWakeUp]);

  const handleWindowFocus = useCallback(() => {
    handleWakeUp("focus");
  }, [handleWakeUp]);

  const handleUserInteraction = useCallback(() => {
    lastUserInteractionRef.current = Date.now();
  }, []);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    
    document.addEventListener("click", handleUserInteraction, { passive: true });
    document.addEventListener("keydown", handleUserInteraction, { passive: true });
    document.addEventListener("scroll", handleUserInteraction, { passive: true });
    document.addEventListener("mousemove", handleUserInteraction, { passive: true });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
      document.removeEventListener("scroll", handleUserInteraction);
      document.removeEventListener("mousemove", handleUserInteraction);
    };
  }, [handleVisibilityChange, handleWindowFocus, handleUserInteraction]);
}

export function TabVisibilityHandler() {
  useTabVisibility();
  return null;
}
