import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Loader2, Bell, Mail, Smartphone } from "lucide-react";
import {
  NOTIFICATION_TYPE_KEYS,
  NOTIFICATION_TYPE_REGISTRY,
  type NotificationTypePref,
  type NotificationTypeKey,
} from "@shared/schema";

export default function NotificationPreferences() {
  useProtectedLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  usePageTitle("Notification Preferences");

  const isAdmin = user?.role === "admin";

  const { data: typePrefs, isLoading: prefsLoading } = useQuery<NotificationTypePref[]>({
    queryKey: ["/api/notifications/preferences"],
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      notificationType: string;
      inAppEnabled?: boolean;
      emailEnabled?: boolean;
      pushEnabled?: boolean;
    }) => {
      const res = await apiRequest("PATCH", "/api/notifications/preferences", payload);
      return res.json();
    },
    onSuccess: (updatedPref: NotificationTypePref) => {
      queryClient.setQueryData<NotificationTypePref[]>(
        ["/api/notifications/preferences"],
        (old) => {
          if (!old) return [updatedPref];
          return old.map((p) =>
            p.notificationType === updatedPref.notificationType ? updatedPref : p,
          );
        },
      );
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/preferences"] });
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (
    notificationType: string,
    channel: "inAppEnabled" | "emailEnabled" | "pushEnabled",
    value: boolean,
  ) => {
    updateMutation.mutate({ notificationType, [channel]: value });
  };

  const getPref = (notificationType: string): NotificationTypePref | undefined => {
    return typePrefs?.find((p) => p.notificationType === notificationType);
  };

  const isLoading = authLoading || prefsLoading;

  if (isLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Notification Preferences" }]}>
        <div className="p-6 flex items-center justify-center" data-testid="loading-preferences">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Notification Preferences" },
      ]}
    >
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Control which notifications you receive and how they are delivered. Each row is a notification type, and each column is a delivery channel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-notification-prefs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 pr-4 text-sm font-medium text-muted-foreground">
                      Notification Type
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-1.5 cursor-default">
                            <Bell className="h-4 w-4" />
                            <span className="hidden sm:inline">In-App</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>In-App Notifications</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-1.5 cursor-default">
                            <Mail className="h-4 w-4" />
                            <span className="hidden sm:inline">Email</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          Email Notifications
                          {!isAdmin && " (admin only)"}
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-1.5 cursor-default">
                            <Smartphone className="h-4 w-4" />
                            <span className="hidden sm:inline">Push</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Push Notifications</TooltipContent>
                      </Tooltip>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {NOTIFICATION_TYPE_KEYS.map((typeKey) => {
                    const meta = NOTIFICATION_TYPE_REGISTRY[typeKey as NotificationTypeKey];
                    const pref = getPref(typeKey);
                    if (!meta) return null;

                    return (
                      <tr
                        key={typeKey}
                        className="border-b border-border last:border-b-0"
                        data-testid={`row-pref-${typeKey}`}
                      >
                        <td className="py-4 pr-4">
                          <p className="text-sm font-medium" data-testid={`text-type-label-${typeKey}`}>
                            {meta.label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {meta.description}
                          </p>
                        </td>
                        <td className="text-center py-4 px-4">
                          <div className="flex justify-center">
                            <Switch
                              checked={pref?.inAppEnabled ?? false}
                              onCheckedChange={(checked) =>
                                handleToggle(typeKey, "inAppEnabled", checked)
                              }
                              disabled={updateMutation.isPending}
                              data-testid={`switch-in-app-${typeKey}`}
                            />
                          </div>
                        </td>
                        <td className="text-center py-4 px-4">
                          <div className="flex justify-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Switch
                                    checked={pref?.emailEnabled ?? false}
                                    onCheckedChange={(checked) =>
                                      handleToggle(typeKey, "emailEnabled", checked)
                                    }
                                    disabled={updateMutation.isPending || !isAdmin}
                                    data-testid={`switch-email-${typeKey}`}
                                  />
                                </div>
                              </TooltipTrigger>
                              {!isAdmin && (
                                <TooltipContent>
                                  Email notifications are currently limited to admin users
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </div>
                        </td>
                        <td className="text-center py-4 px-4">
                          <div className="flex justify-center">
                            <Switch
                              checked={pref?.pushEnabled ?? false}
                              onCheckedChange={(checked) =>
                                handleToggle(typeKey, "pushEnabled", checked)
                              }
                              disabled={updateMutation.isPending}
                              data-testid={`switch-push-${typeKey}`}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!isAdmin && (
              <p className="text-xs text-muted-foreground mt-4" data-testid="text-email-admin-note">
                Email notifications are currently limited to admin users.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
