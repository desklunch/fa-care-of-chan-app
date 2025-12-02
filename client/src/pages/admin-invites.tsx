import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  UserPlus,
  Clock,
  Copy,
  Trash2,
  Mail,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { CreateInviteDialog } from "@/components/create-invite-dialog";
import type { Invite } from "@shared/schema";

export default function AdminInvites() {
  const [, setLocation] = useLocation();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      setLocation("/directory");
    }
  }, [authLoading, isAdmin, setLocation, toast]);

  const { data: invites = [], isLoading } = useQuery<Invite[]>({
    queryKey: ["/api/invites"],
    enabled: isAdmin,
  });

  const revokeInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      return apiRequest("DELETE", `/api/invites/${inviteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invites/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Invite Revoked",
        description: "The invitation has been revoked.",
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
      toast({
        title: "Error",
        description: error.message || "Failed to revoke invite.",
        variant: "destructive",
      });
    },
  });

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite?token=${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: "Invitation link copied to clipboard.",
    });
  };

  const getInviteStatus = (invite: Invite) => {
    if (invite.usedAt) {
      return { label: "Used", variant: "default" as const, icon: CheckCircle };
    }
    if (new Date(invite.expiresAt) < new Date()) {
      return { label: "Expired", variant: "destructive" as const, icon: XCircle };
    }
    return { label: "Pending", variant: "secondary" as const, icon: Clock };
  };

  if (authLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Manage Invitations" }]}>
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </PageLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Manage Invitations" },
      ]}
      customHeaderAction={<CreateInviteDialog />}
    >
      <div className="p-4 md:p-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : invites.length === 0 ? (
          <Card className="border-card-border">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No Invitations</h2>
              <p className="text-muted-foreground mb-6">
                Create an invitation to add new employees to the directory.
              </p>
              <CreateInviteDialog />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => {
              const status = getInviteStatus(invite);
              const StatusIcon = status.icon;
              const isPending = !invite.usedAt && new Date(invite.expiresAt) >= new Date();

              return (
                <Card
                  key={invite.id}
                  className="border-card-border"
                  data-testid={`invite-card-${invite.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <UserPlus className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-medium" data-testid="invite-email">
                            {invite.email}
                          </p>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {invite.firstName && (
                            <span>
                              {invite.firstName} {invite.lastName}
                            </span>
                          )}
                          {invite.title && <span>{invite.title}</span>}
                          {invite.department && (
                            <Badge variant="outline" className="text-xs">
                              {invite.department}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>
                            Created{" "}
                            {invite.createdAt &&
                              new Date(invite.createdAt).toLocaleDateString()}
                          </span>
                          <span>
                            {invite.usedAt
                              ? `Used ${new Date(invite.usedAt).toLocaleDateString()}`
                              : `Expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
                          </span>
                        </div>
                      </div>
                      {isPending && (
                        <div className="flex items-center gap-2 sm:flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyInviteLink(invite.token)}
                            data-testid={`button-copy-invite-${invite.id}`}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Link
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => revokeInviteMutation.mutate(invite.id)}
                            disabled={revokeInviteMutation.isPending}
                            data-testid={`button-revoke-invite-${invite.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
