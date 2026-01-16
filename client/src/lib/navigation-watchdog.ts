import { debugLog } from "@/lib/debug-logger";

const SYNC_CHECK_DELAY_MS = 150;
const MAX_RECOVERY_ATTEMPTS = 3;
const CLICK_NAVIGATION_TIMEOUT_MS = 100;

let isInitialized = false;
let originalPushState: typeof history.pushState | null = null;
let wouterLocationRef: string = window.location.pathname;
let pendingSyncCheck: ReturnType<typeof setTimeout> | null = null;
let recoveryAttempts = 0;

// Click-based navigation recovery
let pendingNavigation: {
  targetHref: string;
  timeoutId: ReturnType<typeof setTimeout>;
} | null = null;

// Programmatic navigation recovery (for setLocation calls)
let pendingProgrammaticNav: {
  targetHref: string;
  timeoutId: ReturnType<typeof setTimeout>;
} | null = null;

export function updateWouterLocation(path: string): void {
  wouterLocationRef = path;
}

function attemptRecovery(): void {
  const browserPathname = window.location.pathname;
  const wouterPathname = wouterLocationRef;
  
  if (browserPathname === wouterPathname) {
    recoveryAttempts = 0;
    return;
  }
  
  recoveryAttempts++;
  
  debugLog("NAVIGATION", `Navigation stall detected (attempt ${recoveryAttempts}/${MAX_RECOVERY_ATTEMPTS})`, {
    browserPathname,
    wouterPathname,
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
    const browserPathname = window.location.pathname;
    const wouterPathname = wouterLocationRef;
    
    if (browserPathname !== wouterPathname) {
      attemptRecovery();
    }
  }, SYNC_CHECK_DELAY_MS);
}

// Clear pending navigation when pushState fires (navigation worked)
function clearPendingNavigation(): void {
  if (pendingNavigation) {
    clearTimeout(pendingNavigation.timeoutId);
    pendingNavigation = null;
  }
  if (pendingProgrammaticNav) {
    clearTimeout(pendingProgrammaticNav.timeoutId);
    pendingProgrammaticNav = null;
  }
}

// Start watchdog for programmatic navigation (call BEFORE setLocation/navigate)
export function startNavigationWatchdog(targetHref: string): void {
  // Skip if already at target
  if (targetHref === window.location.pathname) {
    return;
  }

  // Clear any existing pending navigation
  clearPendingNavigation();

  debugLog("NAVIGATION", "Programmatic navigation started, watchdog timer set", {
    targetHref,
    currentPathname: window.location.pathname,
  });

  const timeoutId = setTimeout(() => {
    pendingProgrammaticNav = null;
    handleStuckNavigation(targetHref);
  }, CLICK_NAVIGATION_TIMEOUT_MS);

  pendingProgrammaticNav = { targetHref, timeoutId };
}

// Handle stuck navigation: wouter's Link didn't call pushState
function handleStuckNavigation(targetHref: string): void {
  debugLog("NAVIGATION", "Stuck navigation detected - wouter Link failed to fire pushState", {
    targetHref,
    currentPathname: window.location.pathname,
    wouterLocation: wouterLocationRef,
  });
  
  // If we're already at the target, no action needed
  if (window.location.pathname === targetHref) {
    debugLog("NAVIGATION", "Already at target path, dispatching popstate to sync wouter");
    window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
    return;
  }
  
  // Manually call pushState to trigger navigation
  debugLog("NAVIGATION", "Forcing navigation via manual pushState", { targetHref });
  
  // Use original pushState to avoid infinite loop
  if (originalPushState) {
    originalPushState(null, "", targetHref);
    
    // Dispatch popstate to wake up wouter
    window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    
    // Schedule sync check to verify recovery worked
    scheduleSyncCheck();
  }
}

// Extract href from a click target (handles clicks on child elements like spans)
function extractHrefFromClick(target: EventTarget | null): string | null {
  if (!target || !(target instanceof Element)) {
    return null;
  }
  
  // Walk up the DOM tree to find an anchor with href
  let element: Element | null = target;
  while (element) {
    if (element.tagName === "A") {
      const href = element.getAttribute("href");
      // Only track internal navigation links (start with /)
      if (href && href.startsWith("/") && !href.startsWith("//")) {
        return href;
      }
      return null;
    }
    element = element.parentElement;
  }
  
  return null;
}

// Handle click on navigation elements
function handleNavClick(event: MouseEvent): void {
  // Ignore modified clicks (ctrl+click, etc.)
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  
  // Ignore non-primary button clicks
  if (event.button !== 0) {
    return;
  }
  
  const targetHref = extractHrefFromClick(event.target);
  if (!targetHref) {
    return;
  }
  
  // If clicking on current page, no navigation expected
  if (targetHref === window.location.pathname) {
    return;
  }
  
  // Clear any existing pending navigation
  clearPendingNavigation();
  
  debugLog("NAVIGATION", "Nav link clicked, starting navigation watchdog timer", {
    targetHref,
    currentPathname: window.location.pathname,
  });
  
  // Start timer - if pushState doesn't fire within timeout, navigation is stuck
  const timeoutId = setTimeout(() => {
    pendingNavigation = null;
    handleStuckNavigation(targetHref);
  }, CLICK_NAVIGATION_TIMEOUT_MS);
  
  pendingNavigation = { targetHref, timeoutId };
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
    // pushState was called - navigation is working, clear any pending timeout
    clearPendingNavigation();
    
    const result = originalPushState!(data, unused, url);
    
    debugLog("NAVIGATION", "pushState intercepted", {
      url: url?.toString(),
    });
    
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
  
  // Listen for clicks on navigation links (capture phase to see all clicks)
  document.addEventListener("click", handleNavClick, { capture: true });
  
  isInitialized = true;
  debugLog("NAVIGATION", "Navigation watchdog initialized");
}

export function useNavigationSync(wouterLocation: string): void {
  updateWouterLocation(wouterLocation);
}
