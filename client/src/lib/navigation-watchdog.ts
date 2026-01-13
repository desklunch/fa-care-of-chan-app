import { debugLog } from "@/lib/debug-logger";

const SYNC_CHECK_DELAY_MS = 150;
const MAX_RECOVERY_ATTEMPTS = 3;

let isInitialized = false;
let originalPushState: typeof history.pushState | null = null;
let wouterLocationRef: string = window.location.pathname;
let pendingSyncCheck: ReturnType<typeof setTimeout> | null = null;
let recoveryAttempts = 0;

export function updateWouterLocation(path: string): void {
  wouterLocationRef = path;
}

function attemptRecovery(): void {
  const browserPath = window.location.pathname;
  const wouterPath = wouterLocationRef;
  
  if (browserPath === wouterPath) {
    recoveryAttempts = 0;
    return;
  }
  
  recoveryAttempts++;
  
  debugLog("NAVIGATION", `Navigation stall detected (attempt ${recoveryAttempts}/${MAX_RECOVERY_ATTEMPTS})`, {
    browserPath,
    wouterPath,
    recoveryAttempts,
  });
  
  if (recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
    debugLog("NAVIGATION", "Max recovery attempts reached - performing hard reload");
    recoveryAttempts = 0;
    window.location.reload();
    return;
  }
  
  debugLog("NAVIGATION", "Dispatching popstate to sync router");
  window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
  
  setTimeout(() => {
    if (window.location.pathname !== wouterLocationRef) {
      attemptRecovery();
    } else {
      debugLog("NAVIGATION", "Recovery successful - router synced");
      recoveryAttempts = 0;
    }
  }, SYNC_CHECK_DELAY_MS);
}

function scheduleSyncCheck(): void {
  if (pendingSyncCheck) {
    clearTimeout(pendingSyncCheck);
  }
  
  pendingSyncCheck = setTimeout(() => {
    pendingSyncCheck = null;
    const browserPath = window.location.pathname;
    const wouterPath = wouterLocationRef;
    
    if (browserPath !== wouterPath) {
      attemptRecovery();
    }
  }, SYNC_CHECK_DELAY_MS);
}

export function initNavigationWatchdog(): void {
  if (isInitialized) {
    debugLog("NAVIGATION", "Navigation watchdog already initialized");
    return;
  }
  
  originalPushState = history.pushState.bind(history);
  
  history.pushState = function (
    data: unknown,
    unused: string,
    url?: string | URL | null
  ) {
    const result = originalPushState!(data, unused, url);
    
    debugLog("NAVIGATION", "pushState intercepted", {
      url: url?.toString(),
    });
    
    window.dispatchEvent(new PopStateEvent("popstate", { state: data }));
    
    scheduleSyncCheck();
    
    return result;
  };
  
  window.addEventListener("popstate", () => {
    debugLog("NAVIGATION", "popstate event fired", {
      state: history.state,
      currentLocation: window.location.pathname,
    });
    scheduleSyncCheck();
  });
  
  isInitialized = true;
  debugLog("NAVIGATION", "Navigation watchdog initialized");
}

export function useNavigationSync(wouterLocation: string): void {
  updateWouterLocation(wouterLocation);
}
