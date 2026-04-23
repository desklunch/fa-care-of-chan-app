import { useEffect } from "react";
import { debugLog } from "@/lib/debug-logger";
import type { User } from "@shared/schema";
import { useBootstrap } from "./useBootstrap";

let prevUser: User | null | undefined = undefined;
let prevLoading = true;
let prevError: Error | null = null;
let prevFetchingKey: string | null = null;

export function useAuth() {
  const {
    data: bootstrap,
    isLoading,
    error,
    isFetching,
    isStale,
    dataUpdatedAt,
  } = useBootstrap();

  const user = (bootstrap?.user ?? null) as User | null;

  useEffect(() => {
    if (prevUser !== user) {
      if (user && !prevUser) {
        debugLog("AUTH", "User authenticated", {
          userId: user.id,
          email: user.email,
          role: user.role,
        });
      } else if (!user && prevUser) {
        debugLog("AUTH", "User logged out or session expired");
      } else if (user && prevUser && user.id !== prevUser.id) {
        debugLog("AUTH", "User changed", {
          fromUserId: prevUser.id,
          toUserId: user.id,
        });
      }
      prevUser = user;
    }

    if (prevLoading && !isLoading) {
      debugLog("AUTH", "Auth loading complete", {
        isAuthenticated: !!user,
        userId: user?.id,
      });
      prevLoading = isLoading;
    } else if (!prevLoading && isLoading) {
      prevLoading = isLoading;
    }

    if (error && error !== prevError) {
      debugLog("AUTH", "Auth error occurred", {
        error: (error as Error).message,
      });
      prevError = error as Error;
    } else if (!error && prevError) {
      prevError = null;
    }
  }, [user, isLoading, error]);

  useEffect(() => {
    if (isFetching) {
      const key = `${dataUpdatedAt ?? 0}:${isStale}`;
      if (prevFetchingKey !== key) {
        prevFetchingKey = key;
        debugLog("AUTH", "Auth query refetching", {
          isStale,
          lastUpdated: dataUpdatedAt
            ? new Date(dataUpdatedAt).toISOString()
            : null,
        });
      }
    }
  }, [isFetching, isStale, dataUpdatedAt]);

  return {
    user: user ?? undefined,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    error,
  };
}
