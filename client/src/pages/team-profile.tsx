import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldRow } from "@/components/inline-edit";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useDriveAuth } from "@/lib/google-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  SquarePen,
  ArrowLeft,
  BellRing,
  HardDrive,
  Loader2,
  LogIn,
  RefreshCw,
} from "lucide-react";
import { Link } from "wouter";
import type { User } from "@shared/schema";
import { usePageTitle } from "@/hooks/use-page-title";

interface DriveStatus {
  connected: boolean;
  needsReauth: boolean;
  accountEmail: string | null;
}

function GoogleDriveSection() {
  const { toast } = useToast();
  const { promptDriveAuth, isGoogleAuthAvailable } = useDriveAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: status, isLoading } = useQuery<DriveStatus>({
    queryKey: ["/api/auth/drive-status"],
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/drive-disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/drive-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drive/search"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drive/folders"] });
      setConfirmOpen(false);
      toast({ title: "Google Drive disconnected" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to disconnect Google Drive",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const connected = !!status?.connected;
  const needsReauth = !!status?.needsReauth;
  const accountEmail = status?.accountEmail || null;

  const everConnected = connected || !!accountEmail;
  let statusLabel = "Not connected";
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  if (connected && !needsReauth) {
    statusLabel = "Connected";
    badgeVariant = "default";
  } else if (needsReauth && everConnected) {
    statusLabel = "Needs re-authorization";
    badgeVariant = "destructive";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDrive className="h-4 w-4" />
          Google Drive
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-5 w-40" />
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant={badgeVariant} data-testid="badge-drive-status">
                {statusLabel}
              </Badge>
              {accountEmail && (
                <span
                  className="text-sm text-muted-foreground truncate"
                  data-testid="text-drive-account-email"
                >
                  {accountEmail}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {connected && !needsReauth
                ? "Used to attach Drive files and generate documents on deals."
                : needsReauth && everConnected
                  ? "Reconnect to restore file attachments and document generation."
                  : "Connect your Google Drive to attach files and generate deal documents."}
            </p>
          </div>
        )}

        {!isGoogleAuthAvailable && (
          <p className="text-xs text-destructive">
            Google sign-in is not configured. Drive features are unavailable.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {(!connected || needsReauth) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => promptDriveAuth()}
              disabled={!isGoogleAuthAvailable}
              data-testid="button-connect-drive"
            >
              {needsReauth ? (
                <RefreshCw className="h-4 w-4 mr-1" />
              ) : (
                <LogIn className="h-4 w-4 mr-1" />
              )}
              {needsReauth ? "Reconnect Google Drive" : "Connect Google Drive"}
            </Button>
          )}

          {connected && (
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-disconnect-drive"
                >
                  Disconnect
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect Google Drive?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You won't be able to attach files from Drive or generate
                    deal documents until you reconnect.
                    {accountEmail && (
                      <>
                        {" "}This will disconnect the account{" "}
                        <span className="font-medium">{accountEmail}</span>.
                      </>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-disconnect-drive">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      disconnectMutation.mutate();
                    }}
                    disabled={disconnectMutation.isPending}
                    data-testid="button-confirm-disconnect-drive"
                  >
                    {disconnectMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    )}
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeamProfile() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useProtectedLocation();
  const { user: currentUser } = useAuth();
  const { can } = usePermissions();

  const { data: member, isLoading, error } = useQuery<User>({
    queryKey: ["/api/team", id],
    enabled: !!id,
  });

  usePageTitle(member ? `${member.firstName} ${member.lastName}` : "Team Member");

  const isOwnProfile = currentUser?.id === member?.id;
  const isAdmin = can('team.manage');
  const canEdit = isOwnProfile || isAdmin;

  if (isLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Team", href: "/team" },
          { label: "Loading..." },
        ]}
      >
        <div className="p-6 max-w-4xl">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error || !member) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Team", href: "/team" },
          { label: "Not Found" },
        ]}
      >
        <div className="p-6 max-w-4xl">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Team Member Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The team member you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => setLocation("/team")} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Team
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  const fullName =
    [member.firstName, member.lastName].filter(Boolean).join(" ") || "Unknown";
  const initials =
    `${member.firstName?.[0] || ""}${member.lastName?.[0] || ""}`.toUpperCase() || "U";

  const editHref = isOwnProfile ? "/profile/edit" : `/team/${id}/edit`;

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Team", href: "/team" },
        { label: fullName },
      ]}
      primaryAction={
        canEdit
          ? {
              label: "Edit Profile",
              icon: SquarePen,
              href: editHref,
            }
          : undefined
      }
    >
      <div className="p-4 md:p-6 pb-2 md:pb-2">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage
              src={member.profileImageUrl || undefined}
              alt={fullName}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-3xl font-bold" data-testid="text-member-name">
            {fullName}
          </h1>
        </div>
      </div>

      <div className="max-w-4xl space-y-6 p-4 md:p-6">
        {isOwnProfile && (
          <Link
            href="/notifications/preferences"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="link-notification-preferences"
          >
            <BellRing className="h-4 w-4" />
            Notification Preferences
          </Link>
        )}
        <Card>
          <CardContent className="p-6">
            <div>
                <FieldRow label="First Name" testId="field-first-name">
                  {member.firstName || <span className="text-muted-foreground">Not set</span>}
                </FieldRow>
                <FieldRow label="Last Name" testId="field-last-name">
                  {member.lastName || <span className="text-muted-foreground">Not set</span>}
                </FieldRow>
                <FieldRow label="Email" testId="field-email">
                  {member.email ? (
                    <a
                      href={`mailto:${member.email}`}
                      className="hover:text-primary transition-colors"
                    >
                      {member.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </FieldRow>
                <FieldRow label="Phone" testId="field-phone">
                  {member.phone ? (
                    <a
                      href={`tel:${member.phone}`}
                      className="hover:text-primary transition-colors"
                    >
                      {member.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </FieldRow>
                <FieldRow label="Title" testId="field-title">
                  {member.title || <span className="text-muted-foreground">Not set</span>}
                </FieldRow>
                <FieldRow label="Department" testId="field-department">
                  {member.department || <span className="text-muted-foreground">Not set</span>}
                </FieldRow>
                <FieldRow label="Location" testId="field-location">
                  {member.location || <span className="text-muted-foreground">Not set</span>}
                </FieldRow>
                <FieldRow label="Role" testId="field-role">
                  <span className="capitalize">{member.role}</span>
                </FieldRow>
                <FieldRow label="Status" testId="field-status">
                  <Badge variant={member.isActive ? "default" : "secondary"}>
                    {member.isActive ? "Active" : "Inactive"}
                  </Badge>
                </FieldRow>
                <FieldRow label="Bio" testId="field-bio">
                  {member.bio ? (
                    <p className="whitespace-pre-wrap">{member.bio}</p>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </FieldRow>
            </div>
          </CardContent>
        </Card>
        {isOwnProfile && <GoogleDriveSection />}
      </div>
    </PageLayout>
  );
}
