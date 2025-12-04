import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DataGridPage } from "@/components/data-grid";
import { DateCellRenderer } from "@/components/data-grid/cell-renderers";
import type { ColumnConfig } from "@/components/data-grid/types";
import {
  Plus,
  Send,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
  CheckCircle,
  Building,
  User,
  Mail,
  Clock,
} from "lucide-react";
import type {
  FormRequest,
  Vendor,
  Contact,
  OutreachToken,
  RecipientType,
} from "@shared/schema";
import { format } from "date-fns";
import type { ICellRendererParams } from "ag-grid-community";

type RequestStatus = "draft" | "sent" | "completed";

interface GridContext {
  onEdit: (request: FormRequest) => void;
  onDelete: (request: FormRequest) => void;
  onSend: (request: FormRequest) => void;
  onManageRecipients: (request: FormRequest) => void;
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
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
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
      <span className="flex items-center gap-1 text-muted-foreground">
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
  if (!data?.dueDate) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
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
          <Pencil className="h-4 w-4 mr-2" />
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
      width: 120,
      cellRenderer: StatusCellRenderer,
    },
  },
  {
    id: "recipients",
    headerName: "Recipients",
    category: "Recipients",
    colDef: {
      width: 120,
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
      width: 140,
      cellRenderer: DueDateCellRenderer,
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
    id: "actions",
    headerName: "",
    category: "Actions",
    toggleable: false,
    colDef: {
      width: 60,
      sortable: false,
      filter: false,
      cellRenderer: ActionsCellRenderer,
    },
  },
];

const defaultVisibleColumns = ["title", "status", "recipients", "dueDate", "createdAt", "actions"];

function RecipientSelectorDialog({
  request,
  open,
  onOpenChange,
  onSave,
  isPending,
}: {
  request: FormRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (recipients: Array<{ type: RecipientType; id: string }>) => void;
  isPending: boolean;
}) {
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const existingTokens = (request as FormRequest & { tokens?: OutreachToken[] })?.tokens || [];
  const existingVendorIds = existingTokens
    .filter((t) => t.recipientType === "vendor" && t.recipientId)
    .map((t) => t.recipientId);
  const existingContactIds = existingTokens
    .filter((t) => t.recipientType === "contact" && t.recipientId)
    .map((t) => t.recipientId);

  const availableVendors = vendors.filter((v) => !existingVendorIds.includes(v.id));
  const availableContacts = contacts.filter((c) => !existingContactIds.includes(c.id));

  const handleSave = () => {
    const recipients: Array<{ type: RecipientType; id: string }> = [
      ...selectedVendors.map((id) => ({ type: "vendor" as RecipientType, id })),
      ...selectedContacts.map((id) => ({ type: "contact" as RecipientType, id })),
    ];
    onSave(recipients);
  };

  const toggleVendor = (id: string) => {
    setSelectedVendors((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (open) {
      setSelectedVendors([]);
      setSelectedContacts([]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Recipients</DialogTitle>
          <DialogDescription>
            Select vendors and/or contacts to receive this form request.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="vendors" className="py-4">
          <TabsList className="w-full">
            <TabsTrigger value="vendors" className="flex-1">
              <Building className="h-4 w-4 mr-2" />
              Vendors ({availableVendors.length})
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex-1">
              <User className="h-4 w-4 mr-2" />
              Contacts ({availableContacts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vendors">
            <ScrollArea className="h-64 border rounded-md p-4">
              {availableVendors.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No available vendors to add.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableVendors.map((vendor) => (
                    <div
                      key={vendor.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => toggleVendor(vendor.id)}
                      data-testid={`recipient-vendor-${vendor.id}`}
                    >
                      <Checkbox
                        checked={selectedVendors.includes(vendor.id)}
                        onCheckedChange={() => toggleVendor(vendor.id)}
                      />
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{vendor.businessName}</p>
                        {vendor.email && (
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {vendor.email}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="contacts">
            <ScrollArea className="h-64 border rounded-md p-4">
              {availableContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No available contacts to add.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => toggleContact(contact.id)}
                      data-testid={`recipient-contact-${contact.id}`}
                    >
                      <Checkbox
                        checked={selectedContacts.includes(contact.id)}
                        onCheckedChange={() => toggleContact(contact.id)}
                      />
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {contact.firstName} {contact.lastName}
                        </p>
                        {contact.emailAddresses?.[0] && (
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {contact.emailAddresses[0]}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            {selectedVendors.length + selectedContacts.length} recipient(s) selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={selectedVendors.length + selectedContacts.length === 0 || isPending}
            >
              {isPending ? "Adding..." : "Add Recipients"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminFormRequestsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();

  const [deleteRequest, setDeleteRequest] = useState<FormRequest | null>(null);
  const [recipientRequest, setRecipientRequest] = useState<FormRequest | null>(null);
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

  const addRecipientsMutation = useMutation({
    mutationFn: async ({ id, recipients }: { id: string; recipients: Array<{ type: RecipientType; id: string }> }) => {
      const res = await apiRequest("POST", `/api/form-requests/${id}/recipients`, { recipients });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-requests"] });
      setRecipientRequest(null);
      toast({ title: "Recipients added", description: "Recipients have been added to the request." });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ variant: "destructive", title: "Session expired", description: "Please log in again." });
        navigate("/");
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to add recipients." });
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

  const handleAddRecipients = (recipients: Array<{ type: RecipientType; id: string }>) => {
    if (recipientRequest) {
      addRecipientsMutation.mutate({ id: recipientRequest.id, recipients });
    }
  };

  const handleEdit = useCallback((request: FormRequest) => {
    navigate(`/admin/forms/requests/${request.id}/edit`);
  }, [navigate]);

  const handleDelete = useCallback((request: FormRequest) => {
    setDeleteRequest(request);
  }, []);

  const handleSend = useCallback((request: FormRequest) => {
    setSendRequest(request);
  }, []);

  const handleManageRecipients = useCallback((request: FormRequest) => {
    setRecipientRequest(request);
  }, []);

  const handleRowClick = useCallback((request: FormRequest) => {
    navigate(`/admin/forms/requests/${request.id}`);
  }, [navigate]);

  const gridContext: GridContext = {
    onEdit: handleEdit,
    onDelete: handleDelete,
    onSend: handleSend,
    onManageRecipients: handleManageRecipients,
  };

  if (isAuthLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Admin" }, { label: "Form Requests" }]}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded w-64" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    navigate("/");
    return null;
  }

  return (
    <PageLayout
      breadcrumbs={[{ label: "Admin" }, { label: "Form Requests" }]}
      actionButton={{
        label: "Create Request",
        href: "/admin/forms/requests/new",
        icon: Plus,
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

      <RecipientSelectorDialog
        request={recipientRequest}
        open={!!recipientRequest}
        onOpenChange={(open) => !open && setRecipientRequest(null)}
        onSave={handleAddRecipients}
        isPending={addRecipientsMutation.isPending}
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
