import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import type { Notification } from "@shared/schema";

function getEntityRoute(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  const routeMap: Record<string, string> = {
    deal: `/deals/${entityId}`,
    venue: `/venues/${entityId}`,
    vendor: `/vendors/${entityId}`,
    contact: `/contacts/${entityId}`,
    client: `/clients/${entityId}`,
    app_feature: `/app/features/${entityId}`,
    app_issue: `/app/issues/${entityId}`,
    form_request: `/form-requests/${entityId}`,
  };
  return routeMap[entityType] || null;
}

export function useNotificationToasts() {
  const { toast } = useToast();
  const seenIdsRef = useRef<Set<string> | null>(null);

  const { data } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    const list = Array.isArray(data) ? data : [];
    if (seenIdsRef.current === null) {
      seenIdsRef.current = new Set(list.map((n) => n.id));
      return;
    }

    const seen = seenIdsRef.current;
    const fresh = list.filter((n) => !seen.has(n.id) && !n.read);
    for (const n of fresh) {
      const route = getEntityRoute(n.entityType, n.entityId);
      toast({
        title: n.title,
        description: n.body ?? undefined,
        action: route ? (
          <ToastAction
            altText="View"
            onClick={() => {
              window.location.href = route;
            }}
            data-testid={`toast-action-view-${n.id}`}
          >
            View
          </ToastAction>
        ) : undefined,
      });
    }
    for (const n of list) {
      seen.add(n.id);
    }
  }, [data, toast]);
}
