import { QueryClient, QueryFunction } from "@tanstack/react-query";

let csrfToken: string | null = null;

export async function fetchCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }
  
  const res = await fetch("/api/csrf-token", {
    credentials: "include",
  });
  
  if (res.ok) {
    const data = await res.json();
    csrfToken = data.csrfToken;
    return csrfToken!;
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
