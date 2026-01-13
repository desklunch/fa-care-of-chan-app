import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { queryClient, clearCsrfToken } from "@/lib/queryClient";
import { debugLog } from "@/lib/debug-logger";
import { useRouterRecovery } from "@/lib/router-recovery-context";

const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes - triggers full recovery (CSRF clear + query invalidation)
const DEBOUNCE_MS = 500; // Prevent rapid-fire wake-up calls

export function useTabVisibility() {
  const [wouterLocation] = useLocation();
  const { forceRouterRemount } = useRouterRecovery();
  const lastActiveRef = useRef<number>(Date.now());
  const lastUserInteractionRef = useRef<number>(Date.now());
  const lastWakeUpRef = useRef<number>(0);
  const wakeUpPendingRef = useRef<boolean>(false);
  const wasHiddenRef = useRef<boolean>(false);
  const wouterLocationRef = useRef<string>(wouterLocation);
  
  // Keep ref in sync with wouter location
  useEffect(() => {
    wouterLocationRef.current = wouterLocation;
  }, [wouterLocation]);

  const forceRouterSync = useCallback(() => {
    const browserPath = window.location.pathname;
    const wouterPath = wouterLocationRef.current;
    const pathsMatch = browserPath === wouterPath;
    
    // Capture original history state to preserve for features that depend on it
    const originalHistoryState = history.state;
    
    debugLog("NAVIGATION", "Forcing router sync (attempt 1: popstate)", {
      browserPath,
      wouterPath,
      pathsMatch,
    });
    
    if (!pathsMatch) {
      debugLog("NAVIGATION", `URL mismatch detected: wouter=${wouterPath}, browser=${browserPath}`);
    }
    
    // Attempt 1: Dispatch popstate - this triggers wouter's useSyncExternalStore to re-read pathname
    window.dispatchEvent(new PopStateEvent("popstate", { state: originalHistoryState }));
    
    // Use setTimeout to verify AFTER React has committed useEffect updates
    // React's commit phase + useEffect runs async, so we need to wait for the event loop
    // 50ms gives React enough time to process the update in most cases
    setTimeout(() => {
      const afterPopstatePath = wouterLocationRef.current;
      
      if (afterPopstatePath === browserPath) {
        if (!pathsMatch) {
          debugLog("NAVIGATION", `Sync successful via popstate: wouter now reports ${afterPopstatePath}`);
        }
        return;
      }
      
      // Attempt 2: Force wouter re-render by temporarily changing PATHNAME (not just query string)
      // Wouter's snapshot reads window.location.pathname, so we must change that
      // Using replaceState ensures no history entries are added
      debugLog("NAVIGATION", `Attempt 1 failed (wouter=${afterPopstatePath}). Trying pathname mutation...`);
      
      const currentSearch = window.location.search;
      const currentHash = window.location.hash;
      const fullPath = browserPath + currentSearch + currentHash;
      
      // Step 1: Replace to a different pathname (add /_recovery segment)
      // This changes window.location.pathname, which wouter's snapshot will detect
      const tempPath = browserPath.replace(/\/$/, "") + "/_recovery";
      history.replaceState(originalHistoryState, "", tempPath);
      window.dispatchEvent(new PopStateEvent("popstate", { state: originalHistoryState }));
      
      // Step 2: Replace back to the correct pathname
      // Wouter will see another pathname change and update again
      history.replaceState(originalHistoryState, "", fullPath);
      window.dispatchEvent(new PopStateEvent("popstate", { state: originalHistoryState }));
      
      // Verify after another timeout to allow React to commit
      setTimeout(() => {
        const afterMutationPath = wouterLocationRef.current;
        
        if (afterMutationPath === browserPath) {
          debugLog("NAVIGATION", `Sync successful via pathname mutation: wouter now reports ${afterMutationPath}`);
          return;
        }
        
        // Attempt 3: Ultimate fallback - hard reload
        // Trigger regardless of initial pathsMatch since we now have a confirmed mismatch
        debugLog("NAVIGATION", `Attempt 2 failed (wouter=${afterMutationPath}). Wouter subscription appears broken.`);
        debugLog("NAVIGATION", `CRITICAL: Router sync failed after all attempts. Performing hard reload.`);
        
        // Hard reload to recover from completely broken state
        window.location.reload();
      }, 50);
    }, 50);
  }, []);

  const handleWakeUp = useCallback((source: string, fromHiddenState: boolean = false) => {
    const now = Date.now();
    // CRITICAL: Capture idle time FIRST, before any other logic runs
    // This prevents race conditions with user interaction handlers
    const capturedIdleTime = now - lastUserInteractionRef.current;
    const timeSinceLastWakeUp = now - lastWakeUpRef.current;
    const exceedsStaleThreshold = capturedIdleTime > STALE_THRESHOLD_MS;
    
    debugLog("LIFECYCLE", `Wake-up triggered from ${source}`, {
      idleTimeMs: capturedIdleTime,
      idleTimeSec: Math.round(capturedIdleTime / 1000),
      timeSinceLastWakeUpMs: timeSinceLastWakeUp,
      wakeUpPending: wakeUpPendingRef.current,
      exceedsStaleThreshold,
      fromHiddenState,
      wasHiddenRef: wasHiddenRef.current,
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
    
    // ALWAYS sync router when returning from hidden state
    // The measured idle time can be unreliable due to browser throttling of hidden tabs
    // When wasHiddenRef is true, we KNOW the tab was hidden - sync regardless of measured time
    if (fromHiddenState) {
      debugLog("LIFECYCLE", `Router sync triggered (from hidden state, measured idle: ${Math.round(capturedIdleTime / 1000)}s)`, {
        source,
        action: "forceRouterSync",
        reason: "wasHiddenRef was true - always sync on hidden->visible transition",
      });
      forceRouterSync();
    }
    
    // Full recovery for stale threshold (includes CSRF clear and query invalidation)
    if (exceedsStaleThreshold) {
      wakeUpPendingRef.current = true;
      lastWakeUpRef.current = now;
      
      debugLog("LIFECYCLE", `App was idle for ${Math.round(capturedIdleTime / 1000)}s - initiating full recovery`, {
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
        
        // Force router remount to create fresh wouter subscriptions
        // This is critical: popstate alone doesn't fix stale subscriptions
        forceRouterRemount();
        
        wakeUpPendingRef.current = false;
        debugLog("LIFECYCLE", "Wake-up recovery complete", { wakeUpPending: false });
      });
    } else if (!fromHiddenState) {
      debugLog("LIFECYCLE", `Idle time (${Math.round(capturedIdleTime / 1000)}s) below threshold - no recovery needed`);
    }
    
    lastActiveRef.current = now;
    lastUserInteractionRef.current = now;
  }, [forceRouterSync, forceRouterRemount]);

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
    // Check wasHiddenRef BEFORE calling handleWakeUp
    // This handles the case where visibilitychange didn't fire but focus did
    const wasHidden = wasHiddenRef.current;
    
    debugLog("FOCUS", "Window received focus", {
      documentVisibility: document.visibilityState,
      activeElement: document.activeElement?.tagName,
      wasHiddenRef: wasHidden,
    });
    
    // Pass wasHidden as fromHiddenState - if tab was hidden, this focus is a wake-up from hidden state
    handleWakeUp("focus", wasHidden);
    
    // Reset wasHiddenRef after focus-based wake-up (visibility handler may not have run)
    if (wasHidden) {
      wasHiddenRef.current = false;
    }
  }, [handleWakeUp]);

  const handleWindowBlur = useCallback(() => {
    debugLog("FOCUS", "Window lost focus", {
      documentVisibility: document.visibilityState,
    });
    // Mark as hidden when focus is lost - catches cases where visibilitychange doesn't fire
    // (e.g., switching between windows on same desktop, or some browser behaviors)
    wasHiddenRef.current = true;
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
