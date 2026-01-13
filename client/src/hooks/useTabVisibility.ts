import { useEffect, useRef, useCallback } from "react";
import { queryClient, clearCsrfToken } from "@/lib/queryClient";
import { debugLog } from "@/lib/debug-logger";

const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes - lowered from 5 to catch more stale scenarios
const ROUTER_SYNC_THRESHOLD_MS = 10 * 1000; // 10 seconds - always sync router after this idle time
const DEBOUNCE_MS = 500; // Prevent rapid-fire wake-up calls

export function useTabVisibility() {
  const lastActiveRef = useRef<number>(Date.now());
  const lastUserInteractionRef = useRef<number>(Date.now());
  const lastWakeUpRef = useRef<number>(0);
  const wakeUpPendingRef = useRef<boolean>(false);
  const wasHiddenRef = useRef<boolean>(false);

  const forceRouterSync = useCallback(() => {
    debugLog("NAVIGATION", "Forcing router sync via popstate event");
    window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
  }, []);

  const handleWakeUp = useCallback((source: string, fromHiddenState: boolean = false) => {
    const now = Date.now();
    const idleTime = now - lastUserInteractionRef.current;
    const timeSinceLastWakeUp = now - lastWakeUpRef.current;
    const exceedsStaleThreshold = idleTime > STALE_THRESHOLD_MS;
    const exceedsRouterSyncThreshold = idleTime > ROUTER_SYNC_THRESHOLD_MS;
    
    debugLog("LIFECYCLE", `Wake-up triggered from ${source}`, {
      idleTimeMs: idleTime,
      idleTimeSec: Math.round(idleTime / 1000),
      timeSinceLastWakeUpMs: timeSinceLastWakeUp,
      wakeUpPending: wakeUpPendingRef.current,
      exceedsStaleThreshold,
      exceedsRouterSyncThreshold,
      fromHiddenState,
    });
    
    // Debounce: prevent multiple wake-ups in quick succession (visibility + focus fire together)
    if (timeSinceLastWakeUp < DEBOUNCE_MS) {
      debugLog("LIFECYCLE", `Wake-up debounced (${timeSinceLastWakeUp}ms < ${DEBOUNCE_MS}ms)`);
      return;
    }
    
    // Prevent concurrent wake-up processing
    if (wakeUpPendingRef.current) {
      debugLog("LIFECYCLE", "Wake-up skipped - another wake-up already pending");
      return;
    }
    
    // Always sync router when returning from hidden state after router sync threshold
    // This prevents the "frozen router" issue where React click handlers fire but navigation doesn't happen
    if (fromHiddenState && exceedsRouterSyncThreshold) {
      debugLog("LIFECYCLE", `Router sync triggered (idle ${Math.round(idleTime / 1000)}s, from hidden state)`, {
        source,
        action: "forceRouterSync",
      });
      forceRouterSync();
    }
    
    // Full recovery for stale threshold (includes CSRF clear and query invalidation)
    if (exceedsStaleThreshold) {
      wakeUpPendingRef.current = true;
      lastWakeUpRef.current = now;
      
      debugLog("LIFECYCLE", `App was idle for ${Math.round(idleTime / 1000)}s - initiating full recovery`, {
        source,
        actions: ["clearCsrfToken", "forceRouterSync", "invalidateQueries"],
      });
      
      // Clear CSRF token to force refresh on next mutation
      clearCsrfToken();
      debugLog("SESSION", "CSRF token cleared due to idle timeout");
      
      // Sync router (may be redundant if already synced above, but safe)
      forceRouterSync();
      
      // Use requestIdleCallback if available, otherwise setTimeout
      // This prevents blocking the main thread during heavy query invalidation
      const scheduleInvalidation = (callback: () => void) => {
        if ('requestIdleCallback' in window) {
          debugLog("QUERY", "Scheduling query invalidation via requestIdleCallback");
          (window as any).requestIdleCallback(callback, { timeout: 2000 });
        } else {
          debugLog("QUERY", "Scheduling query invalidation via setTimeout (fallback)");
          setTimeout(callback, 100);
        }
      };
      
      scheduleInvalidation(() => {
        debugLog("QUERY", "Executing queryClient.invalidateQueries()");
        queryClient.invalidateQueries();
        wakeUpPendingRef.current = false;
        debugLog("LIFECYCLE", "Wake-up recovery complete", { wakeUpPending: false });
      });
    } else if (!fromHiddenState || !exceedsRouterSyncThreshold) {
      debugLog("LIFECYCLE", `Idle time (${Math.round(idleTime / 1000)}s) below threshold - no recovery needed`);
    }
    
    lastActiveRef.current = now;
    lastUserInteractionRef.current = now;
  }, [forceRouterSync]);

  const handleVisibilityChange = useCallback(() => {
    const wasHidden = wasHiddenRef.current;
    const isNowVisible = document.visibilityState === "visible";
    
    debugLog("VISIBILITY", `Document visibility changed to: ${document.visibilityState}`, {
      hidden: document.hidden,
      hasFocus: document.hasFocus(),
      wasHidden,
    });
    
    // Track hidden state
    if (document.hidden) {
      wasHiddenRef.current = true;
    }
    
    if (isNowVisible && wasHidden) {
      // Transitioning from hidden to visible - this is a high-risk wake-up scenario
      handleWakeUp("visibility", true);
      wasHiddenRef.current = false;
    } else if (isNowVisible) {
      handleWakeUp("visibility", false);
    }
  }, [handleWakeUp]);

  const handleWindowFocus = useCallback(() => {
    debugLog("FOCUS", "Window received focus", {
      documentVisibility: document.visibilityState,
      activeElement: document.activeElement?.tagName,
    });
    handleWakeUp("focus");
  }, [handleWakeUp]);

  const handleWindowBlur = useCallback(() => {
    debugLog("FOCUS", "Window lost focus", {
      documentVisibility: document.visibilityState,
    });
  }, []);

  const handlePageShow = useCallback((event: PageTransitionEvent) => {
    debugLog("LIFECYCLE", `pageshow event fired`, {
      persisted: event.persisted,
      documentVisibility: document.visibilityState,
    });
    if (event.persisted) {
      debugLog("LIFECYCLE", "Page restored from bfcache - triggering wake-up");
      // bfcache restoration is always a high-risk scenario
      handleWakeUp("pageshow-bfcache", true);
    }
  }, [handleWakeUp]);

  const handlePageHide = useCallback((event: PageTransitionEvent) => {
    debugLog("LIFECYCLE", `pagehide event fired`, {
      persisted: event.persisted,
    });
  }, []);

  const handleOnline = useCallback(() => {
    debugLog("LIFECYCLE", "Browser went online");
  }, []);

  const handleOffline = useCallback(() => {
    debugLog("LIFECYCLE", "Browser went offline");
  }, []);

  const handleUserInteraction = useCallback(() => {
    lastUserInteractionRef.current = Date.now();
  }, []);

  useEffect(() => {
    debugLog("LIFECYCLE", "TabVisibilityHandler mounted - attaching event listeners");
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    document.addEventListener("click", handleUserInteraction, { passive: true });
    document.addEventListener("keydown", handleUserInteraction, { passive: true });
    document.addEventListener("scroll", handleUserInteraction, { passive: true });
    document.addEventListener("mousemove", handleUserInteraction, { passive: true });

    return () => {
      debugLog("LIFECYCLE", "TabVisibilityHandler unmounting - removing event listeners");
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
      document.removeEventListener("scroll", handleUserInteraction);
      document.removeEventListener("mousemove", handleUserInteraction);
    };
  }, [handleVisibilityChange, handleWindowFocus, handleWindowBlur, handlePageShow, handlePageHide, handleOnline, handleOffline, handleUserInteraction]);
}

export function TabVisibilityHandler() {
  useTabVisibility();
  return null;
}
