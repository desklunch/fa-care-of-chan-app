import { useEffect, useRef } from "react";
import { debugLog } from "@/lib/debug-logger";
import type { User } from "@shared/schema";
import { useBootstrap } from "./useBootstrap";

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

  const prevUserRef = useRef<User | null | undefined>(undefined);
  const prevLoadingRef = useRef<boolean>(true);
  const prevErrorRef = useRef<Error | null>(null);

  useEffect(() => {
    if (prevUserRef.current !== user) {
      if (user && !prevUserRef.current) {
        debugLog("AUTH", "User authenticated", {
          userId: user.id,
          email: user.email,
          role: user.role,
        });
      } else if (!user && prevUserRef.current) {
        debugLog("AUTH", "User logged out or session expired");
      } else if (user && prevUserRef.current && user.id !== prevUserRef.current.id) {
        debugLog("AUTH", "User changed", {
          fromUserId: prevUserRef.current.id,
          toUserId: user.id,
        });
      }
      prevUserRef.current = user;
    }

    if (prevLoadingRef.current && !isLoading) {
      debugLog("AUTH", "Auth loading complete", {
        isAuthenticated: !!user,
        userId: user?.id,
      });
    }
    prevLoadingRef.current = isLoading;

    if (error && error !== prevErrorRef.current) {
      debugLog("AUTH", "Auth error occurred", {
        error: (error as Error).message,
      });
    }
    prevErrorRef.current = (error as Error) ?? null;
  }, [user, isLoading, error]);

  useEffect(() => {
    if (isFetching) {
      debugLog("AUTH", "Auth query refetching", {
        isStale,
        lastUpdated: dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null,
      });
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
