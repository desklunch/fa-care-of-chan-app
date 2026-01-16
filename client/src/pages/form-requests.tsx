import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DataGridPage } from "@/components/data-grid";
import { DateCellRenderer } from "@/components/data-grid/cell-renderers";
import type { ColumnConfig } from "@/components/data-grid/types";
import {
  CircleFadingPlus,
  Send,
  MoreVertical,
  SquarePen,
  Trash2,
  Users,
  CheckCircle,
  Clock,
} from "lucide-react";
import type { FormRequest } from "@shared/schema";
import { format } from "date-fns";
import type { ICellRendererParams } from "ag-grid-community";

type RequestStatus = "draft" | "sent" | "completed";

interface GridContext {
  onEdit: (request: FormRequest) => void;
  onDelete: (request: FormRequest) => void;
  onSend: (request: FormRequest) => void;
}

const statusConfig: Record<RequestStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  sent: { label: "Sent", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
};

function TitleCellRenderer({ data }: ICellRendererParams<FormRequest>) {
  if (!data) return null;
  return (
    <span className="font-medium" data-testid={`text-request-title-${data.id}`}>
      {data.title}
    </span>
  );
}

function StatusCellRenderer({ data }: ICellRendererParams<FormRequest>) {
  if (!data) return null;
  const config = statusConfig[data.status as RequestStatus] || { label: data.status, variant: "secondary" };
  return (
    <div className="h-full flex items-center">
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    </div>

  );
}

interface FormRequestWithCounts extends FormRequest {
  recipientCount?: number;
  respondedCount?: number;
}

function RecipientsCellRenderer({ data }: ICellRendererParams<FormRequestWithCounts>) {
  if (!data) return null;
  const recipientCount = data.recipientCount ?? 0;
  const respondedCount = data.respondedCount ?? 0;
  
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1">
        <Users className="h-3 w-3" />
        {recipientCount}
      </span>
      {respondedCount > 0 && (
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-3 w-3" />
          {respondedCount}
        </span>
      )}
    </div>
  );
}

function DueDateCellRenderer({ data }: ICellRendererParams<FormRequest>) {
  if (!data?.dueDate) return <span className="">—</span>;
  return (
    <span className="flex items-center gap-1">
      <Clock className="h-3 w-3" />
      {format(new Date(data.dueDate), "MMM d, yyyy")}
    </span>
  );
}

function ActionsCellRenderer({ data, context }: ICellRendererParams<FormRequestWithCounts, unknown, GridContext>) {
  if (!data || !context) return null;
  
  const recipientCount = data.recipientCount ?? 0;
  const respondedCount = data.respondedCount ?? 0;
  const pendingCount = recipientCount - respondedCount;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" data-testid={`button-request-menu-${data.id}`}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); context.onEdit(data); }}>
          <SquarePen className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); context.onManageRecipients(data); }}>
          <Users className="h-4 w-4 mr-2" />
          Manage Recipients
        </DropdownMenuItem>
        {data.status === "draft" && pendingCount > 0 && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); context.onSend(data); }}>
            <Send className="h-4 w-4 mr-2" />
            Send to Recipients
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-destructive"
          onClick={(e) => { e.stopPropagation(); context.onDelete(data); }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const requestColumns: ColumnConfig<FormRequest>[] = [
  {
    id: "title",
    headerName: "Title",
    field: "title",
    category: "Info",
    colDef: {
      flex: 2,
      minWidth: 200,
      cellRenderer: TitleCellRenderer,
    },
  },
  {
    id: "description",
    headerName: "Description",
    field: "description",
    category: "Info",
    colDef: {
      flex: 2,
      minWidth: 200,
      valueFormatter: (params) => params.value || "—",
    },
  },
  {
    id: "status",
    headerName: "Status",
    field: "status",
    category: "Status",
    colDef: {
      flex: 1,
      minWidth: 120,
      cellRenderer: StatusCellRenderer,
    },
  },
  {
    id: "recipients",
    headerName: "Recipients",
    category: "Recipients",
    colDef: {
      flex: 1,
      minWidth: 120,
      cellRenderer: RecipientsCellRenderer,
      valueGetter: (params) => {
        return (params.data as FormRequestWithCounts)?.recipientCount ?? 0;
      },
    },
  },
  {
    id: "dueDate",
    headerName: "Due Date",
    field: "dueDate",
    category: "Dates",
    colDef: {
      flex: 1,
      minWidth: 140,
      cellRenderer: DueDateCellRenderer,
    },
  },
  {
    id: "createdAt",
    headerName: "Created",
    field: "createdAt",
    category: "Dates",
    colDef: {
      flex: 1,
      minWidth: 120,
      cellRenderer: DateCellRenderer,
    },
  },
];

const defaultVisibleColumns = ["title", "status", "recipients", "dueDate", "createdAt"];

export default function AdminFormRequestsPage() {
  usePageTitle("Form Requests");
  const [, navigate] = useProtectedLocation();
  const { toast } = useToast();
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();

  const [deleteRequest, setDeleteRequest] = useState<FormRequest | null>(null);
  const [sendRequest, setSendRequest] = useState<FormRequest | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/form-requests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-requests"] });
      setDeleteRequest(null);
      toast({ title: "Request deleted", description: "Form request has been deleted." });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ variant: "destructive", title: "Session expired", description: "Please log in again." });
        navigate("/");
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete request." });
      }
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/form-requests/${id}/send`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-requests"] });
      setSendRequest(null);
      toast({
        title: "Emails sent",
        description: `Successfully sent ${data.sentCount} email(s).`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ variant: "destructive", title: "Session expired", description: "Please log in again." });
        navigate("/");
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to send emails." });
      }
    },
  });

  const handleEdit = useCallback((request: FormRequest) => {
    navigate(`/forms/requests/${request.id}/edit`);
  }, [navigate]);

  const handleDelete = useCallback((request: FormRequest) => {
    setDeleteRequest(request);
  }, []);

  const handleSend = useCallback((request: FormRequest) => {
    setSendRequest(request);
  }, []);

  const handleRowClick = useCallback((request: FormRequest) => {
    navigate(`/forms/requests/${request.id}`);
  }, [navigate]);

  const gridContext: GridContext = {
    onEdit: handleEdit,
    onDelete: handleDelete,
    onSend: handleSend,
  };

  if (isAuthLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Forms" }, { label: "Requests" }]}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded w-64" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  return (
    <PageLayout
      breadcrumbs={[{ label: "Forms" }, { label: "Requests" }]}
      primaryAction={{
        label: "New Request",
        href: "/forms/requests/new",
        icon: CircleFadingPlus,
        variant: "default",
      }}
    >
      <DataGridPage
        queryKey="/api/form-requests"
        columns={requestColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        searchFields={["title", "description"]}
        searchPlaceholder="Search requests..."
        onRowClick={handleRowClick}
        getRowId={(request: FormRequest) => request.id}
        context={gridContext}
        emptyMessage="No form requests yet"
        emptyDescription="Create a request to start collecting information from vendors or contacts."
      />

      <AlertDialog open={!!deleteRequest} onOpenChange={(open) => !open && setDeleteRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteRequest?.title}"? This will also delete all
              associated tokens and responses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRequest && deleteMutation.mutate(deleteRequest.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!sendRequest} onOpenChange={(open) => !open && setSendRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Form Request</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const req = sendRequest as FormRequestWithCounts;
                const recipientCount = req?.recipientCount ?? 0;
                const respondedCount = req?.respondedCount ?? 0;
                const pendingCount = recipientCount - respondedCount;
                return `Send this form request to ${pendingCount} pending recipient(s)? Each will receive an email with a unique link to complete the form.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sendRequest && sendMutation.mutate(sendRequest.id)}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? "Sending..." : "Send Emails"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
