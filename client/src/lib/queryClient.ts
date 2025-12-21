import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
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

/**
 * Retry logic that only retries network/connection errors, not HTTP errors (4xx/5xx).
 * This handles stale HTTP keep-alive connections gracefully.
 */
function shouldRetryQuery(failureCount: number, error: Error): boolean {
  // Don't retry more than 2 times
  if (failureCount >= 2) return false;
  
  // Don't retry HTTP errors (4xx, 5xx) - these are intentional server responses
  const errorMessage = error?.message || "";
  if (errorMessage.match(/^[45]\d{2}:/)) return false;
  
  // Retry network/connection errors (failed to fetch, connection reset, etc.)
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: shouldRetryQuery,
    },
    mutations: {
      retry: false,
    },
  },
});
