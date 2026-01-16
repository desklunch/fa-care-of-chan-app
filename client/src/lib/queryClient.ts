import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { debugLog } from "@/lib/debug-logger";

let csrfToken: string | null = null;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchCsrfToken(): Promise<string> {
  if (csrfToken) {
    debugLog("SESSION", "Using cached CSRF token");
    return csrfToken;
  }
  
  debugLog("SESSION", "Fetching new CSRF token");
  
  // Retry with exponential backoff for session establishment race condition
  const maxRetries = 3;
  const baseDelay = 500; // 500ms, 1000ms, 2000ms
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const startTime = performance.now();
    const res = await fetch("/api/csrf-token", {
      credentials: "include",
    });
    const duration = Math.round(performance.now() - startTime);
    
    debugLog("SESSION", `CSRF token fetch attempt ${attempt + 1}/${maxRetries}`, {
      status: res.status,
      ok: res.ok,
      durationMs: duration,
    });
    
    if (res.ok) {
      const data = await res.json();
      csrfToken = data.csrfToken;
      debugLog("SESSION", "CSRF token obtained successfully");
      return csrfToken!;
    }
    
    // If 401, session might not be established yet - retry with backoff
    if (res.status === 401 && attempt < maxRetries - 1) {
      const delay = baseDelay * Math.pow(2, attempt);
      debugLog("SESSION", `CSRF fetch failed (401), retrying in ${delay}ms...`, { attempt });
      await sleep(delay);
      continue;
    }
    
    // Non-401 error or final attempt - throw
    break;
  }
  
  debugLog("SESSION", "CSRF token fetch failed after all retries", { maxRetries });
  throw new Error("Failed to fetch CSRF token");
}

export function clearCsrfToken(): void {
  debugLog("SESSION", "CSRF token cleared");
  csrfToken = null;
}

async function throwIfResNotOk(res: Response, url: string, method: string) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    debugLog("API", `Request failed: ${method} ${url}`, {
      status: res.status,
      statusText: res.statusText,
      errorText: text.slice(0, 200),
    });
    
    if (res.status === 403 && text.includes("CSRF")) {
      debugLog("SESSION", "CSRF validation failed - clearing token");
      clearCsrfToken();
    }
    
    if (res.status === 401) {
      debugLog("AUTH", `Unauthorized response for ${method} ${url}`, {
        status: res.status,
      });
    }
    
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const startTime = performance.now();
  debugLog("API", `Starting request: ${method} ${url}`, {
    hasBody: !!data,
  });
  
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const isAuthEndpoint = url.startsWith("/api/auth/");
    if (!isAuthEndpoint) {
      try {
        const token = await fetchCsrfToken();
        headers["x-csrf-token"] = token;
      } catch (e) {
        debugLog("API", `CSRF token fetch failed for ${method} ${url}`, { error: String(e) });
      }
    } else {
      debugLog("API", `Skipping CSRF for auth endpoint: ${url}`);
    }
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  
  const duration = Math.round(performance.now() - startTime);
  debugLog("API", `Response received: ${method} ${url}`, {
    status: res.status,
    ok: res.ok,
    durationMs: duration,
  });

  await throwIfResNotOk(res, url, method);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const startTime = performance.now();
    
    debugLog("QUERY", `Fetching: ${url}`);
    
    const res = await fetch(url, {
      credentials: "include",
    });
    
    const duration = Math.round(performance.now() - startTime);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      debugLog("QUERY", `Query returned 401 (returnNull behavior): ${url}`, { durationMs: duration });
      return null;
    }
    
    if (!res.ok) {
      debugLog("QUERY", `Query failed: ${url}`, {
        status: res.status,
        durationMs: duration,
      });
    } else {
      debugLog("QUERY", `Query success: ${url}`, {
        status: res.status,
        durationMs: duration,
      });
    }

    await throwIfResNotOk(res, url, "GET");
    return await res.json();
  };

function shouldRetryQuery(failureCount: number, error: Error): boolean {
  if (failureCount >= 2) return false;
  
  const errorMessage = error?.message || "";
  if (errorMessage.match(/^[45]\d{2}:/)) return false;
  
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 5 * 60 * 1000,
      retry: shouldRetryQuery,
    },
    mutations: {
      retry: false,
    },
  },
});
