type LogCategory = 
  | "LIFECYCLE"
  | "FOCUS"
  | "VISIBILITY"
  | "QUERY"
  | "AUTH"
  | "API"
  | "NAVIGATION"
  | "INPUT"
  | "SESSION"
  | "STALL";

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
    STALL: "color: #ff0000; font-weight: bold; background: #ffcccc",
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
    STALL: "⚠️",
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

let navigationStallCount = 0;
let lastExpectedPath: string | null = null;
let stallCheckTimeoutId: ReturnType<typeof setTimeout> | null = null;

export function trackNavigationIntent(expectedPath: string): void {
  lastExpectedPath = expectedPath;
  const currentPath = window.location.pathname;
  
  debugLog("NAVIGATION", `Navigation intent: ${currentPath} -> ${expectedPath}`);
  
  if (stallCheckTimeoutId) {
    clearTimeout(stallCheckTimeoutId);
  }
  
  stallCheckTimeoutId = setTimeout(() => {
    const actualPath = window.location.pathname;
    if (actualPath !== expectedPath && lastExpectedPath === expectedPath) {
      navigationStallCount++;
      debugLog("STALL", `Navigation stall detected! Expected: ${expectedPath}, Actual: ${actualPath}`, {
        stallCount: navigationStallCount,
        timeSinceIntent: "250ms",
        expectedPath,
        actualPath,
      });
    }
    lastExpectedPath = null;
    stallCheckTimeoutId = null;
  }, 250);
}

export function getNavigationStallCount(): number {
  return navigationStallCount;
}

export function resetNavigationStallCount(): void {
  navigationStallCount = 0;
}

(window as any).__debugLog = debugLog;
(window as any).__dumpLogHistory = dumpLogHistory;
(window as any).__getLogHistory = getLogHistory;
(window as any).__getAppState = getAppState;
(window as any).__getNavigationStallCount = getNavigationStallCount;
(window as any).__resetNavigationStallCount = resetNavigationStallCount;

debugLog("LIFECYCLE", "Debug logger initialized", {
  startTime: new Date(appStartTime).toISOString(),
  userAgent: navigator.userAgent.slice(0, 100),
});
