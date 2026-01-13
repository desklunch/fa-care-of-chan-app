import { debugLog } from "@/lib/debug-logger";

let isPatched = false;
let originalPushState: typeof history.pushState | null = null;
let originalReplaceState: typeof history.replaceState | null = null;

export function patchHistoryMethods(): void {
  if (isPatched) {
    debugLog("NAVIGATION", "History methods already patched, skipping");
    return;
  }

  originalPushState = history.pushState.bind(history);
  originalReplaceState = history.replaceState.bind(history);

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

  history.replaceState = function (
    data: unknown,
    unused: string,
    url?: string | URL | null
  ) {
    const result = originalReplaceState!(data, unused, url);
    debugLog("NAVIGATION", "replaceState intercepted, dispatching popstate", {
      url: url?.toString(),
    });
    window.dispatchEvent(new PopStateEvent("popstate", { state: data }));
    return result;
  };

  isPatched = true;
  debugLog("NAVIGATION", "History methods patched - pushState/replaceState now dispatch popstate");
}

export function unpatchHistoryMethods(): void {
  if (!isPatched || !originalPushState || !originalReplaceState) {
    return;
  }

  history.pushState = originalPushState;
  history.replaceState = originalReplaceState;
  originalPushState = null;
  originalReplaceState = null;
  isPatched = false;
  debugLog("NAVIGATION", "History methods restored to original");
}

export function isHistoryPatched(): boolean {
  return isPatched;
}
