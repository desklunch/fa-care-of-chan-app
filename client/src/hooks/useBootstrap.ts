import {
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryFunction,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { getQueryFn } from "@/lib/queryClient";
import { debugLog } from "@/lib/debug-logger";
import type { User, Theme } from "@shared/schema";
import type { PermissionContext } from "@shared/permissions";

export interface BootstrapData {
  user: (User & { permissionContext?: PermissionContext }) | null;
  themes: Theme[];
  themePreference: { selectedThemeId: string | null };
  notifications: { unreadCount: number };
  roles: Array<{
    id: number;
    name: string;
    description: string | null;
    permissions: string[];
  }>;
  push: { vapidPublicKey: string | null };
}

export const BOOTSTRAP_QUERY_KEY = ["/api/bootstrap"] as const;

const TRANSIENT_401_RETRY_DELAY_MS = 400;

const bootstrapQueryFn: QueryFunction<BootstrapData | null> = async (ctx) => {
  const fetcher = getQueryFn<BootstrapData | null>({ on401: "returnNull" });
  const first = await fetcher(ctx);
  if (first !== null) return first;

  // The first /api/bootstrap response was 401 — give the session store a
  // brief moment to settle and retry once before treating the user as
  // logged out. This handles the post-reload race where the session row
  // is still being committed.
  debugLog("AUTH", "Bootstrap 401 — retrying once after short delay", {
    delayMs: TRANSIENT_401_RETRY_DELAY_MS,
  });
  await new Promise((resolve) => setTimeout(resolve, TRANSIENT_401_RETRY_DELAY_MS));
  return await fetcher(ctx);
};

export function useBootstrap() {
  const qc = useQueryClient();
  const query = useQuery<BootstrapData | null>({
    queryKey: BOOTSTRAP_QUERY_KEY,
    queryFn: bootstrapQueryFn,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error: any) => {
      const status = error?.status ?? Number(String(error?.message ?? "").match(/^(\d{3}):/)?.[1]);
      if (status === 401 || status === 403) return false;
      return failureCount < 3;
    },
    retryDelay: (attempt) =>
      Math.min(1000 * 2 ** attempt, 8000) + Math.floor(Math.random() * 250),
  });

  useEffect(() => {
    const data = query.data;
    if (!data) return;
    qc.setQueryData(["/api/auth/user"], data.user);
    qc.setQueryData(["/api/themes"], data.themes);
    qc.setQueryData(["/api/themes/user-preference"], data.themePreference);
    qc.setQueryData(["/api/notifications/unread-count"], {
      count: data.notifications.unreadCount,
    });
    if (data.roles && data.roles.length > 0) {
      qc.setQueryData(["/api/roles/names"], data.roles);
    }
  }, [query.data, qc]);

  return query;
}

export async function fetchBootstrapWithRetry(
  qc: QueryClient,
  maxAttempts: number = 4
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const data = await qc.fetchQuery<BootstrapData | null>({
        queryKey: BOOTSTRAP_QUERY_KEY,
        queryFn: getQueryFn<BootstrapData | null>({ on401: "returnNull" }),
        staleTime: 0,
      });
      if (data && data.user) return true;
      if (data === null) return false;
    } catch {
      // fall through to retry
    }
    const delay = Math.min(500 * 2 ** attempt, 4000) + Math.floor(Math.random() * 250);
    await new Promise((r) => setTimeout(r, delay));
  }
  return false;
}

