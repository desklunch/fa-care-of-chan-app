import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { Notification } from "@shared/schema";

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

interface NotificationBellProps {
  variant?: "default" | "sidebar" | "sidebar-collapsed";
}

export function NotificationBell({ variant = "default" }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const [, setLocation] = useLocation();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000,
  });

  const { data: notificationsData, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: isOpen,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const sendTestMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/test"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const isSidebar = variant === "sidebar" || variant === "sidebar-collapsed";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(event.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && isSidebar && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPanelStyle({
        position: "fixed" as const,
        left: `${rect.right + 8}px`,
        top: `${rect.top}px`,
        zIndex: 9999,
      });
    }
  }, [isOpen, isSidebar]);

  const unreadCount = unreadData?.count || 0;
  const notifications = notificationsData || [];

  function handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    const route = getEntityRoute(notification.entityType, notification.entityId);
    if (route) {
      setLocation(route);
      setIsOpen(false);
    }
  }

  const triggerButton = variant === "sidebar" ? (
    <Button
      variant="ghost"
      onClick={() => setIsOpen(!isOpen)}
      className="px-2 w-full justify-between gap-2 font-normal relative focus:bg-background focus:text-foreground"
      data-testid="button-notification-bell"
      aria-label="Notifications"
    >
      <span className="text-sm flex items-center gap-3 font-medium ">
        <Bell className="h-4 w-4" />
        Notifications
      </span>
      {unreadCount > 0 && (
        <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-[10px]" data-testid="badge-notification-count">
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  ) : variant === "sidebar-collapsed" ? (
    <Button
      variant="secondary"
      size="icon"
      onClick={() => setIsOpen(!isOpen)}
      className="size-10 justify-start p-2.5 relative"
      data-testid="button-notification-bell"
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center"
          data-testid="badge-notification-count"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsOpen(!isOpen)}
      className="relative"
      data-testid="button-notification-bell"
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center"
          data-testid="badge-notification-count"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  );

  return (
    <div className="relative" ref={triggerRef}>
      {triggerButton}

      {isOpen && (
        <div
          ref={panelRef}
          className={`w-80 md:w-96 bg-popover border border-border rounded-md shadow-lg z-[9999] ${isSidebar ? "fixed" : "absolute right-0 top-full mt-2"}`}
          style={isSidebar ? panelStyle : undefined}
          data-testid="panel-notifications"
        >
          <div className="flex items-center justify-between gap-2 p-3">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  data-testid="button-mark-all-read"
                  className="text-xs"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                data-testid="button-close-notifications"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Separator />
          <ScrollArea className="max-h-[400px]">
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-sm text-muted-foreground text-center flex flex-col items-center gap-3">
                <span>No notifications yet</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sendTestMutation.mutate()}
                  disabled={sendTestMutation.isPending}
                  data-testid="button-send-test-notification"
                >
                  <Send className="h-3 w-3 mr-1" />
                  {sendTestMutation.isPending ? "Sending..." : "Send Test"}
                </Button>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 cursor-pointer hover-elevate border-b border-border last:border-b-0 ${
                      !notification.read ? "bg-accent/30" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                    data-testid={`notification-item-${notification.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm truncate ${!notification.read ? "font-semibold" : ""}`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        {notification.body && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.body}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {timeAgo(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate(notification.id);
                          }}
                          data-testid={`button-mark-read-${notification.id}`}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
