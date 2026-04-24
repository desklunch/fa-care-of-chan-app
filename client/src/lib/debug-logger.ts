type LogCategory = 
  | "LIFECYCLE"
  | "FOCUS"
  | "VISIBILITY"
  | "QUERY"
  | "AUTH"
  | "API"
  | "NAVIGATION"
  | "INPUT"
  | "SESSION";

interface LogEntry {
  timestamp: string;
  elapsed: string;
  category: LogCategory;
  message: string;
  data?: unknown;
}

const LOG_HISTORY_SIZE = 100;
const logHistory: LogEntry[] = [];
const appStartTime = Date.now();

const DEBUG_FLAG_KEY = "__coc_debug_enabled";

function computeDebugEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const param = params.get("debug");
    if (param === "1" || param === "true") {
      try {
        sessionStorage.setItem(DEBUG_FLAG_KEY, "1");
      } catch {
        // ignore
      }
      return true;
    }
    if (param === "0" || param === "false") {
      try {
        sessionStorage.removeItem(DEBUG_FLAG_KEY);
      } catch {
        // ignore
      }
      return false;
    }
    return sessionStorage.getItem(DEBUG_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

let debugEnabled = computeDebugEnabled();

export function isDebugEnabled(): boolean {
  return debugEnabled;
}

export function setDebugEnabled(enabled: boolean): void {
  debugEnabled = enabled;
  try {
    if (enabled) {
      sessionStorage.setItem(DEBUG_FLAG_KEY, "1");
    } else {
      sessionStorage.removeItem(DEBUG_FLAG_KEY);
    }
  } catch {
    // ignore
  }
}

function getTimestamp(): string {
  return new Date().toISOString().split("T")[1].slice(0, 12);
}

function getElapsed(): string {
  const elapsed = Date.now() - appStartTime;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function getCategoryStyle(category: LogCategory): string {
  const styles: Record<LogCategory, string> = {
    LIFECYCLE: "color: #9c27b0; font-weight: bold",
    FOCUS: "color: #2196f3; font-weight: bold",
    VISIBILITY: "color: #00bcd4; font-weight: bold",
    QUERY: "color: #ff9800; font-weight: bold",
    AUTH: "color: #f44336; font-weight: bold",
    API: "color: #4caf50; font-weight: bold",
    NAVIGATION: "color: #673ab7; font-weight: bold",
    INPUT: "color: #795548; font-weight: bold",
    SESSION: "color: #e91e63; font-weight: bold",
  };
  return styles[category];
}

function getCategoryIcon(category: LogCategory): string {
  const icons: Record<LogCategory, string> = {
    LIFECYCLE: "🔄",
    FOCUS: "🎯",
    VISIBILITY: "👁️",
    QUERY: "📡",
    AUTH: "🔐",
    API: "🌐",
    NAVIGATION: "🧭",
    INPUT: "👆",
    SESSION: "🎫",
  };
  return icons[category];
}

export function debugLog(category: LogCategory, message: string, data?: unknown): void {
  const timestamp = getTimestamp();
  const elapsed = getElapsed();
  const icon = getCategoryIcon(category);
  const style = getCategoryStyle(category);
  
  const entry: LogEntry = { timestamp, elapsed, category, message, data };
  logHistory.push(entry);
  if (logHistory.length > LOG_HISTORY_SIZE) {
    logHistory.shift();
  }

  if (!debugEnabled) return;

  const prefix = `[${timestamp}] [+${elapsed}]`;

  if (data !== undefined) {
    console.log(
      `%c${icon} ${prefix} [${category}] ${message}`,
      style,
      data
    );
  } else {
    console.log(
      `%c${icon} ${prefix} [${category}] ${message}`,
      style
    );
  }
}

export function getLogHistory(): LogEntry[] {
  return [...logHistory];
}

export function getLogHistoryByCategory(category: LogCategory): LogEntry[] {
  return logHistory.filter(entry => entry.category === category);
}

export function dumpLogHistory(): void {
  console.log("=== DEBUG LOG HISTORY ===");
  logHistory.forEach(entry => {
    const icon = getCategoryIcon(entry.category);
    console.log(
      `${icon} [${entry.timestamp}] [+${entry.elapsed}] [${entry.category}] ${entry.message}`,
      entry.data !== undefined ? entry.data : ""
    );
  });
  console.log("=========================");
}

export function getAppState(): {
  uptime: string;
  documentVisibility: DocumentVisibilityState;
  documentHasFocus: boolean;
  onlineStatus: boolean;
  windowInnerSize: { width: number; height: number };
  logCount: number;
  lastLogEntry: LogEntry | null;
} {
  return {
    uptime: getElapsed(),
    documentVisibility: document.visibilityState,
    documentHasFocus: document.hasFocus(),
    onlineStatus: navigator.onLine,
    windowInnerSize: { width: window.innerWidth, height: window.innerHeight },
    logCount: logHistory.length,
    lastLogEntry: logHistory.length > 0 ? logHistory[logHistory.length - 1] : null,
  };
}

(window as any).__debugLog = debugLog;
(window as any).__dumpLogHistory = dumpLogHistory;
(window as any).__getLogHistory = getLogHistory;
(window as any).__getAppState = getAppState;
(window as any).__enableDebug = () => {
  setDebugEnabled(true);
  console.log("[debug-logger] enabled (sticky for this tab)");
};
(window as any).__disableDebug = () => {
  setDebugEnabled(false);
  console.log("[debug-logger] disabled");
};

const RELOAD_MARKER_KEY = "__coc_last_reload_trigger";
const RELOAD_MARKER_FRESHNESS_MS = 1500;

function readReloadMarkerTimestamp(): number | null {
  try {
    const raw = sessionStorage.getItem(RELOAD_MARKER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.at === "string") {
      const t = Date.parse(parsed.at);
      return Number.isFinite(t) ? t : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function recordReloadTrigger(source: string, data?: Record<string, unknown>): void {
  try {
    const payload = {
      source,
      at: new Date().toISOString(),
      pathname: window.location.pathname + window.location.search,
      ...(data || {}),
    };
    sessionStorage.setItem(RELOAD_MARKER_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage unavailable — best effort only
  }
  debugLog("LIFECYCLE", "Reload triggered", { source, ...(data || {}) });
}

debugLog("LIFECYCLE", "Debug logger initialized", {
  startTime: new Date(appStartTime).toISOString(),
  userAgent: navigator.userAgent.slice(0, 100),
});

try {
  const raw = sessionStorage.getItem(RELOAD_MARKER_KEY);
  if (raw) {
    sessionStorage.removeItem(RELOAD_MARKER_KEY);
    const parsed = JSON.parse(raw);
    debugLog("LIFECYCLE", "Previous page was reloaded", parsed);
  }
} catch {
  // ignore
}

// Last-resort breadcrumb: if the document is unloaded without any of our
// instrumented call sites having recorded a marker, stamp an "unknown"
// marker so the next page-load entry always names *some* source. This
// catches reloads driven by the browser/extensions/embedded iframes that
// our React tree never sees.
if (typeof window !== "undefined") {
  const writeFallbackMarker = () => {
    try {
      const lastMarkerAt = readReloadMarkerTimestamp();
      const now = Date.now();
      if (lastMarkerAt !== null && now - lastMarkerAt < RELOAD_MARKER_FRESHNESS_MS) {
        // A real reload-trigger marker was just recorded — leave it alone.
        return;
      }
      const state = getAppState();
      const payload = {
        source: "unknown",
        at: new Date(now).toISOString(),
        pathname: window.location.pathname + window.location.search,
        referrer: document.referrer || null,
        documentVisibility: state.documentVisibility,
        hasFocus: state.documentHasFocus,
        online: state.onlineStatus,
        lastLogEntry: state.lastLogEntry,
        unloadAt: new Date(now).toISOString(),
      };
      sessionStorage.setItem(RELOAD_MARKER_KEY, JSON.stringify(payload));
    } catch {
      // best effort only
    }
  };

  // pagehide is more reliable than beforeunload (esp. on mobile / bfcache),
  // but we listen to both to maximize coverage. The fallback writer is
  // idempotent because of the freshness check above.
  window.addEventListener("pagehide", writeFallbackMarker, { capture: true });
  window.addEventListener("beforeunload", writeFallbackMarker, { capture: true });
}
