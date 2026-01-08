import { QueryClient, QueryFunction } from "@tanstack/react-query";

let csrfToken: string | null = null;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }
  
  // Retry with exponential backoff for session establishment race condition
  const maxRetries = 3;
  const baseDelay = 500; // 500ms, 1000ms, 2000ms
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch("/api/csrf-token", {
      credentials: "include",
    });
    
    if (res.ok) {
      const data = await res.json();
      csrfToken = data.csrfToken;
      return csrfToken!;
    }
    
    // If 401, session might not be established yet - retry with backoff
    if (res.status === 401 && attempt < maxRetries - 1) {
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`CSRF token fetch failed (401), retrying in ${delay}ms...`);
      await sleep(delay);
      continue;
    }
    
    // Non-401 error or final attempt - throw
    break;
  }
  
  throw new Error("Failed to fetch CSRF token");
}

export function clearCsrfToken(): void {
  csrfToken = null;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    if (res.status === 403 && text.includes("CSRF")) {
      clearCsrfToken();
    }
    
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    try {
      const token = await fetchCsrfToken();
      headers["x-csrf-token"] = token;
    } catch (e) {
      console.warn("Failed to fetch CSRF token:", e);
    }
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
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
