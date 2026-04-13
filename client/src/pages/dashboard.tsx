import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { PageLayout } from "@/framework";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Activity,
  Plus,
  FileEdit,
  Trash2,
  LogIn,
  LogOut,
  Inbox,
} from "lucide-react";
import { useLocation } from "wouter";
import type { Notification } from "@shared/schema";

type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  performedBy: string | null;
  performedAt: string | Date;
  status: string;
  changes: unknown;
  metadata: unknown;
  performerName?: string | null;
  entityName?: string | null;
  resolvedEntityType?: string | null;
  resolvedEntityId?: string | null;
};

const entityTypeLabels: Record<string, string> = {
  deal: "deal",
  venue: "venue",
  vendor: "vendor",
  contact: "contact",
  client: "client",
  app_feature: "feature",
  app_issue: "issue",
  form_request: "form request",
  user: "user",
  form_response: "form response",
  deal_task: "task",
};

function formatActivityTitle(log: AuditLogEntry): { prefix: string; entityTypeLabel: string } {
  const targetType = log.resolvedEntityType || log.entityType;
  const label = entityTypeLabels[targetType] || targetType.replace(/_/g, " ");

  if (log.entityType === "comment") {
    const verb = log.action === "create" ? "Commented on"
      : log.action === "update" ? "Edited a comment on"
      : log.action === "delete" ? "Deleted a comment on"
      : `${capitalize(log.action)} comment on`;
    return { prefix: verb, entityTypeLabel: label };
  }

  const verb = log.action === "create" ? "Created"
    : log.action === "update" ? "Updated"
    : log.action === "delete" ? "Deleted"
    : log.action === "login" ? "Logged in"
    : log.action === "logout" ? "Logged out"
    : capitalize(log.action.replace(/_/g, " "));

  if (log.action === "login" || log.action === "logout") {
    return { prefix: verb, entityTypeLabel: "" };
  }

  return { prefix: `${verb} the`, entityTypeLabel: label };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getEntityRoute(entityType?: string | null, entityId?: string | null): string | null {
  if (!entityType || !entityId) return null;
  const routeMap: Record<string, string> = {
    deal: `/deals/${entityId}`,
    venue: `/venues/${entityId}`,
    vendor: `/vendors/${entityId}`,
    contact: `/contacts/${entityId}`,
    client: `/clients/${entityId}`,
    app_feature: `/features/${entityId}`,
    app_issue: `/issues/${entityId}`,
    form_request: `/form-requests/${entityId}`,
  };
  return routeMap[entityType] || null;
}

function timeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString();
}

const actionIcons: Record<string, typeof Activity> = {
  create: Plus,
  update: FileEdit,
  delete: Trash2,
  login: LogIn,
  logout: LogOut,
};

const actionColors: Record<string, string> = {
  create: "bg-green-500/10 text-green-600 dark:text-green-400",
  update: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  delete: "bg-red-500/10 text-red-600 dark:text-red-400",
  login: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  logout: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

function NotificationsPanel() {
  const [, setLocation] = useLocation();
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", { limit: 25 }],
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=25");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground" data-testid="empty-notifications">
        <Inbox className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">No notifications yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="divide-y divide-border">
        {notifications.map((notification) => {
          const route = getEntityRoute(notification.entityType, notification.entityId);
          return (
            <div
              key={notification.id}
              className={`p-3 ${route ? "cursor-pointer hover-elevate" : ""} ${!notification.read ? "bg-accent/30" : ""}`}
              onClick={() => {
                if (route) setLocation(route);
              }}
              data-testid={`notification-item-${notification.id}`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {notification.type && (
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {notification.type}
                      </Badge>
                    )}
                    <p className={`text-sm truncate ${!notification.read ? "font-semibold" : ""}`}>
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                  {notification.body && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.body}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {timeAgo(notification.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function ActivityPanel() {
  const [, setLocation] = useLocation();
  const { data: logs, isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ["/api/audit-logs/mine"],
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground" data-testid="empty-activity">
        <Activity className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="divide-y divide-border">
        {logs.map((log) => {
          const ActionIcon = actionIcons[log.action] || Activity;
          const colorClass = actionColors[log.action] || "bg-muted text-muted-foreground";
          const { prefix, entityTypeLabel } = formatActivityTitle(log);
          const route = getEntityRoute(log.resolvedEntityType, log.resolvedEntityId);

          return (
            <div
              key={log.id}
              className="p-3"
              data-testid={`activity-item-${log.id}`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-md shrink-0 ${colorClass}`}>
                  <ActionIcon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{prefix}</span>
                    {entityTypeLabel && (
                      <span className="text-muted-foreground"> {entityTypeLabel} </span>
                    )}
                    {log.entityName && route ? (
                      <a
                        href={route}
                        onClick={(e) => {
                          e.preventDefault();
                          setLocation(route);
                        }}
                        className="font-medium text-primary hover:underline"
                        data-testid={`link-entity-${log.id}`}
                      >
                        {log.entityName}
                      </a>
                    ) : log.entityName ? (
                      <span className="font-medium">{log.entityName}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {timeAgo(log.performedAt)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export default function Dashboard() {
  usePageTitle("Dashboard");

  return (
    <PageLayout breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card data-testid="panel-notifications">
            <div className="flex items-center gap-2 p-4 border-b border-border">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">My Notifications</h2>
            </div>
            <NotificationsPanel />
          </Card>

          <Card data-testid="panel-activity">
            <div className="flex items-center gap-2 p-4 border-b border-border">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">My Activity</h2>
            </div>
            <ActivityPanel />
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
