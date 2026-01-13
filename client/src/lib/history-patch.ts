import { debugLog } from "@/lib/debug-logger";

let isPatched = false;
let originalPushState: typeof history.pushState | null = null;

export function patchHistoryMethods(): void {
  if (isPatched) {
    debugLog("NAVIGATION", "History methods already patched, skipping");
    return;
  }

  originalPushState = history.pushState.bind(history);

  // Only patch pushState (actual navigation), not replaceState (state updates)
  // replaceState is often called for query params and can cause loops
  history.pushState = function (
    data: unknown,
    unused: string,
    url?: string | URL | null
  ) {
    const result = originalPushState!(data, unused, url);
    debugLog("NAVIGATION", "pushState intercepted, dispatching popstate", {
      url: url?.toString(),
    });
    window.dispatchEvent(new PopStateEvent("popstate", { state: data }));
    return result;
  };

  isPatched = true;
  debugLog("NAVIGATION", "History pushState patched - now dispatches popstate");
}

export function unpatchHistoryMethods(): void {
  if (!isPatched || !originalPushState) {
    return;
  }

  history.pushState = originalPushState;
  originalPushState = null;
  isPatched = false;
  debugLog("NAVIGATION", "History pushState restored to original");
}

export function isHistoryPatched(): boolean {
  return isPatched;
}
