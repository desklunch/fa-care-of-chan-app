import { useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Copy, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import { CreateInviteDialog } from "@/components/create-invite-dialog";
import { DataGridPage } from "@/components/data-grid";
import { DateCellRenderer, BadgeCellRenderer } from "@/components/data-grid/cell-renderers";
import type { ColumnConfig } from "@/components/data-grid/types";
import type { Invite } from "@shared/schema";
import type { ICellRendererParams } from "ag-grid-community";

type InviteStatus = "used" | "expired" | "pending";

function getInviteStatus(invite: Invite): InviteStatus {
  if (invite.usedAt) return "used";
  if (new Date(invite.expiresAt) < new Date()) return "expired";
  return "pending";
}

function StatusCellRenderer({ value }: ICellRendererParams<Invite, InviteStatus>) {
  if (!value) return null;
  
  const config: Record<InviteStatus, { label: string; variant: "default" | "destructive" | "secondary"; icon: typeof CheckCircle }> = {
    used: { label: "Used", variant: "default", icon: CheckCircle },
    expired: { label: "Expired", variant: "destructive", icon: XCircle },
    pending: { label: "Pending", variant: "secondary", icon: Clock },
  };
  
  const { label, variant, icon: Icon } = config[value];
  
  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function InviteActionsCellRenderer({ 
  data, 
  context 
}: ICellRendererParams<Invite> & { context: { copyInviteLink: (token: string) => void; revokeInvite: (id: string) => void; isPending: boolean } }) {
  if (!data) return null;
  
  const status = getInviteStatus(data);
  const isPending = status === "pending";
  
  if (!isPending) return null;
  
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          context.copyInviteLink(data.token);
        }}
        data-testid={`button-copy-invite-${data.id}`}
      >
        <Copy className="h-4 w-4 mr-2" />
        Copy Link
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={(e) => {
          e.stopPropagation();
          context.revokeInvite(data.id);
        }}
        disabled={context.isPending}
        data-testid={`button-revoke-invite-${data.id}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

const inviteColumns: ColumnConfig<Invite>[] = [
  {
    id: "email",
    headerName: "Email",
    field: "email",
    category: "Contact",
    colDef: {
      flex: 1,
      minWidth: 200,
    },
  },
  {
    id: "name",
    headerName: "Name",
    category: "Profile",
    colDef: {
      flex: 1,
      minWidth: 150,
      valueGetter: (params) => {
        const first = params.data?.firstName || "";
        const last = params.data?.lastName || "";
        return `${first} ${last}`.trim() || "—";
      },
    },
  },
  {
    id: "title",
    headerName: "Title",
    field: "title",
    category: "Profile",
    colDef: {
      flex: 1,
      minWidth: 150,
      valueFormatter: (params) => params.value || "—",
    },
  },
  {
    id: "department",
    headerName: "Department",
    field: "department",
    category: "Profile",
    colDef: {
      width: 140,
      cellRenderer: BadgeCellRenderer,
    },
  },
  {
    id: "status",
    headerName: "Status",
    category: "Status",
    colDef: {
      width: 120,
      valueGetter: (params) => params.data ? getInviteStatus(params.data) : null,
      cellRenderer: StatusCellRenderer,
    },
  },
  {
    id: "createdAt",
    headerName: "Created",
    field: "createdAt",
    category: "Dates",
    colDef: {
      width: 120,
      cellRenderer: DateCellRenderer,
    },
  },
  {
    id: "expiresAt",
    headerName: "Expires",
    field: "expiresAt",
    category: "Dates",
    colDef: {
      width: 120,
      cellRenderer: DateCellRenderer,
    },
  },
  {
    id: "usedAt",
    headerName: "Used At",
    field: "usedAt",
    category: "Dates",
    hide: true,
    colDef: {
      width: 120,
      cellRenderer: DateCellRenderer,
    },
  },
  {
    id: "actions",
    headerName: "Actions",
    category: "Actions",
    toggleable: false,
    colDef: {
      width: 180,
      sortable: false,
      filter: false,
      cellRenderer: InviteActionsCellRenderer,
      pinned: "right",
    },
  },
];

const defaultVisibleColumns = ["email", "name", "title", "department", "status", "createdAt", "expiresAt", "actions"];

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
      setLocation("/team");
    }
  }, [authLoading, isAdmin, setLocation, toast]);

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

  const copyInviteLink = useCallback((token: string) => {
    const link = `${window.location.origin}/invite?token=${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: "Invitation link copied to clipboard.",
    });
  }, [toast]);

  const revokeInvite = useCallback((inviteId: string) => {
    revokeInviteMutation.mutate(inviteId);
  }, [revokeInviteMutation]);

  const gridContext = {
    copyInviteLink,
    revokeInvite,
    isPending: revokeInviteMutation.isPending,
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
      <DataGridPage
        queryKey="/api/invites"
        columns={inviteColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        searchFields={["email", "firstName", "lastName", "title", "department"]}
        searchPlaceholder="Search invitations..."
        emptyMessage="No invitations found. Create one to get started."
        getRowId={(invite) => invite.id}
        context={gridContext}
      />
    </PageLayout>
  );
}
