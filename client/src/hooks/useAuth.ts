import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { debugLog } from "@/lib/debug-logger";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error, isFetching, isStale, dataUpdatedAt } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn<User | null>({ on401: "returnNull" }),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
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
        error: error.message,
      });
    }
    prevErrorRef.current = error;
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
