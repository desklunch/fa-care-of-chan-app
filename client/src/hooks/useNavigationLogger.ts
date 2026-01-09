import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { debugLog } from "@/lib/debug-logger";

export function useNavigationLogger() {
  const [location] = useLocation();
  const prevLocationRef = useRef<string>(location);
  const navigationCountRef = useRef<number>(0);

  useEffect(() => {
    if (location !== prevLocationRef.current) {
      navigationCountRef.current += 1;
      debugLog("NAVIGATION", `Route changed: ${prevLocationRef.current} -> ${location}`, {
        from: prevLocationRef.current,
        to: location,
        navigationCount: navigationCountRef.current,
      });
      prevLocationRef.current = location;
    }
  }, [location]);

  useEffect(() => {
    debugLog("NAVIGATION", `Initial route: ${location}`);

    const handlePopState = (event: PopStateEvent) => {
      debugLog("NAVIGATION", "popstate event fired", {
        state: event.state,
        currentLocation: window.location.pathname,
      });
    };

    const handleHashChange = () => {
      debugLog("NAVIGATION", "hashchange event fired", {
        hash: window.location.hash,
        pathname: window.location.pathname,
      });
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [location]);
}

export function NavigationLogger() {
  useNavigationLogger();
  return null;
}
