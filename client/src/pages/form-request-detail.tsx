import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { usePageTitle } from "@/hooks/use-page-title";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AgGridReact } from "ag-grid-react";
import { gridTheme } from "@/lib/ag-grid-theme";
import { ModuleRegistry, AllCommunityModule, ColDef, ICellRendererParams } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

import {
  SquarePen,
  Send,
  MoreVertical,
  Calendar,
  User,
  Clock,
  FileText,
  Users,
  Building,
  Mail,
  CheckCircle,
  AlertCircle,
  Trash2,
  Eye,
  ExternalLink,
  ClipboardList,
} from "lucide-react";
import { format } from "date-fns";
import type {
  FormRequest,
  FormSection,
  FormField as FormFieldType,
  OutreachToken,
  Vendor,
  Contact,
  FormResponse,
} from "@shared/schema";

type RequestStatus = "draft" | "sent" | "completed";
type TokenStatus = "pending" | "sent" | "responded" | "expired";

interface TokenWithResponse extends OutreachToken {
  vendor?: Vendor | null;
  contact?: Contact | null;
  response?: FormResponse | null;
}

interface FormRequestWithTokens extends FormRequest {
  tokens?: TokenWithResponse[];
  recipientCount?: number;
  respondedCount?: number;
  createdBy?: { id: string; firstName: string; lastName: string };
}

interface RecipientRow {
  id: string;
  type: "vendor" | "contact";
  name: string;
  email: string | null;
  status: TokenStatus;
  sentAt: Date | null;
  respondedAt: Date | null;
  token: OutreachToken;
}

interface ResponseRow {
  id: string;
  recipientName: string;
  recipientType: "vendor" | "contact";
  sentAt: Date | null;
  submittedAt: Date | null;
  responseData: Record<string, unknown>;
}

const statusConfig: Record<RequestStatus, { label: string; variant: "default" | "secondary" | "outline"; icon: typeof Clock }> = {
  draft: { label: "Draft", variant: "secondary", icon: FileText },
  sent: { label: "Sent", variant: "default", icon: Send },
  completed: { label: "Completed", variant: "outline", icon: CheckCircle },
};

const tokenStatusConfig: Record<TokenStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pending", variant: "secondary" },
  sent: { label: "Sent", variant: "default" },
  responded: { label: "Responded", variant: "outline" },
  expired: { label: "Expired", variant: "destructive" },
};

function RecipientTypeCellRenderer({ data }: ICellRendererParams<RecipientRow>) {
  if (!data) return null;
  return (
    <div className="flex items-center gap-2">
      {data.type === "vendor" ? (
        <Building className="h-4 w-4 text-muted-foreground" />
      ) : (
        <User className="h-4 w-4 text-muted-foreground" />
      )}
      <span className="capitalize">{data.type}</span>
    </div>
  );
}

function RecipientNameCellRenderer({ data }: ICellRendererParams<RecipientRow>) {
  if (!data) return null;
  return (
    <span className="font-medium" data-testid={`text-recipient-name-${data.id}`}>
      {data.name}
    </span>
  );
}

function RecipientEmailCellRenderer({ data }: ICellRendererParams<RecipientRow>) {
  if (!data?.email) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      <Mail className="h-3 w-3" />
      {data.email}
    </span>
  );
}

function RecipientStatusCellRenderer({ data }: ICellRendererParams<RecipientRow>) {
  if (!data) return null;
  const config = tokenStatusConfig[data.status] || { label: data.status, variant: "secondary" };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function DateCellRenderer({ value }: { value: Date | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return <span>{format(new Date(value), "MMM d, yyyy")}</span>;
}

function RecipientActionsCellRenderer({ data, context }: ICellRendererParams<RecipientRow, unknown, { onRemove: (row: RecipientRow) => void }>) {
  if (!data || !context) return null;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" data-testid={`button-recipient-menu-${data.id}`}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="text-destructive"
          onClick={(e) => { e.stopPropagation(); context.onRemove(data); }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ReadOnlyFormRenderer({ schema }: { schema: FormSection[] }) {
  if (!schema || schema.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No form fields defined</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {schema.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle className="text-lg">{section.title || "Untitled Section"}</CardTitle>
            {section.description && (
              <CardDescription>{section.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {section.fields.map((field) => (
              <ReadOnlyField key={field.id} field={field} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ReadOnlyField({ field }: { field: FormFieldType }) {
  const renderInput = () => {
    switch (field.type) {
      case "text":
      case "email":
      case "phone":
      case "url":
      case "number":
      case "date":
        return (
          <Input
            disabled
            placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}`}
            type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          />
        );
      case "textarea":
        return (
          <Textarea
            disabled
            placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}`}
            className="resize-none"
            rows={4}
          />
        );
      case "select":
        return (
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <input type="checkbox" disabled className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">{field.placeholder}</span>
          </div>
        );
      case "toggle":
        return (
          <div className="flex items-center gap-2">
            <Switch disabled />
            <span className="text-sm text-muted-foreground">{field.placeholder}</span>
          </div>
        );
      default:
        return (
          <Input disabled placeholder={field.placeholder} />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label className={field.required ? "after:content-['*'] after:ml-0.5 after:text-destructive" : ""}>
        {field.name}
      </Label>
      {renderInput()}
    </div>
  );
}

export default function AdminFormRequestDetailPage() {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();

  const [activeTab, setActiveTab] = useState("overview");
  const [removeRecipient, setRemoveRecipient] = useState<RecipientRow | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  const { data: request, isLoading } = useQuery<FormRequestWithTokens>({
    queryKey: ["/api/form-requests", id],
    enabled: !!id && isAuthenticated,
  });

  usePageTitle(request?.title || "Form Request");

  const removeRecipientMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      await apiRequest("DELETE", `/api/outreach-tokens/${tokenId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-requests", id] });
      setRemoveRecipient(null);
      toast({ title: "Recipient removed", description: "Recipient has been removed from the request." });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ variant: "destructive", title: "Session expired", description: "Please log in again." });
        navigate("/");
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to remove recipient." });
      }
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/form-requests/${id}/send`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-requests", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/form-requests"] });
      setSendDialogOpen(false);
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

  const handleRemoveRecipient = useCallback((row: RecipientRow) => {
    setRemoveRecipient(row);
  }, []);

  const recipientGridContext = {
    onRemove: handleRemoveRecipient,
  };

  const recipientColumnDefs: ColDef<RecipientRow>[] = [
    {
      headerName: "Type",
      field: "type",
      flex: 1,
      minWidth: 100,
      cellRenderer: RecipientTypeCellRenderer,
    },
    {
      headerName: "Name",
      field: "name",
      flex: 1,
      minWidth: 180,
      cellRenderer: RecipientNameCellRenderer,
    },
    {
      headerName: "Email",
      field: "email",
      flex: 1,
      minWidth: 200,
      cellRenderer: RecipientEmailCellRenderer,
    },
    {
      headerName: "Status",
      field: "status",
      flex: 1,
      minWidth: 100,
      cellRenderer: RecipientStatusCellRenderer,
    },
    {
      headerName: "Sent",
      field: "sentAt",
      flex: 1,
      minWidth: 100,
      cellRenderer: (params: ICellRendererParams<RecipientRow>) => (
        <DateCellRenderer value={params.value} />
      ),
    },
    {
      headerName: "Responded",
      field: "respondedAt",
      flex: 1,
      minWidth: 100,
      cellRenderer: (params: ICellRendererParams<RecipientRow>) => (
        <DateCellRenderer value={params.value} />
      ),
    },
    {
      headerName: "",
      flex: 1,
      minWidth: 100,
      sortable: false,
      filter: false,
      cellRenderer: RecipientActionsCellRenderer,
    },
  ];

  const recipientRows: RecipientRow[] = (request?.tokens || []).map((token) => {
    const isVendor = token.recipientType === "vendor";
    const vendor = token.vendor;
    const contact = token.contact;

    return {
      id: token.id,
      type: token.recipientType as "vendor" | "contact",
      name: isVendor && vendor 
        ? vendor.businessName 
        : contact 
          ? `${contact.firstName} ${contact.lastName}` 
          : "Unknown",
      email: isVendor && vendor 
        ? vendor.email 
        : contact?.emailAddresses?.[0] || null,
      status: token.status as TokenStatus,
      sentAt: token.sentAt,
      respondedAt: token.respondedAt,
      token,
    };
  });

  // Build response rows from tokens that have responses
  const responseRows: ResponseRow[] = (request?.tokens || [])
    .filter((token) => token.response !== null && token.response !== undefined)
    .map((token) => {
      const isVendor = token.recipientType === "vendor";
      const vendor = token.vendor;
      const contact = token.contact;

      return {
        id: token.id,
        recipientName: isVendor && vendor 
          ? vendor.businessName 
          : contact 
            ? `${contact.firstName} ${contact.lastName}` 
            : "Unknown",
        recipientType: token.recipientType as "vendor" | "contact",
        sentAt: token.sentAt,
        submittedAt: token.response?.submittedAt || null,
        responseData: token.response?.responseData || {},
      };
    });

  // Build dynamic column definitions for responses based on form schema
  const getFormFieldLabel = (fieldId: string): string => {
    const schema = request?.formSchema as FormSection[] | undefined;
    if (!schema) return fieldId;
    for (const section of schema) {
      const field = section.fields.find((f) => f.id === fieldId);
      if (field) return field.name;
    }
    return fieldId;
  };

  const responseColumnDefs: ColDef<ResponseRow>[] = [
    {
      headerName: "Recipient",
      field: "recipientName",
      flex: 1,
      minWidth: 200,
      pinned: "left",
      cellRenderer: (params: ICellRendererParams<ResponseRow>) => {
        if (!params.data) return null;
        return (
          <div className="flex items-center gap-2">
            {params.data.recipientType === "vendor" ? (
              <Building className="h-4 w-4 text-muted-foreground" />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-medium">{params.data.recipientName}</span>
          </div>
        );
      },
    },
    {
      headerName: "Sent At",
      field: "sentAt",
      flex: 1,
      minWidth: 160,
      cellRenderer: (params: ICellRendererParams<ResponseRow>) => {
        if (!params.value) return <span className="text-muted-foreground">—</span>;
        return <span>{format(new Date(params.value), "MMM d, yyyy h:mm a")}</span>;
      },
    },
    {
      headerName: "Submitted At",
      field: "submittedAt",
      flex: 1,
      minWidth: 160,
      cellRenderer: (params: ICellRendererParams<ResponseRow>) => {
        if (!params.value) return <span className="text-muted-foreground">—</span>;
        return <span>{format(new Date(params.value), "MMM d, yyyy h:mm a")}</span>;
      },
    },
    // Dynamically add columns for each form field
    ...(() => {
      const schema = request?.formSchema as FormSection[] | undefined;
      if (!schema) return [];
      const fieldColumns: ColDef<ResponseRow>[] = [];
      for (const section of schema) {
        for (const field of section.fields) {
          fieldColumns.push({
            headerName: field.name,
            field: `responseData.${field.id}` as keyof ResponseRow,
            flex: 1,
            minWidth: 150,
            valueGetter: (params) => {
              const data = params.data?.responseData?.[field.id];
              if (data === undefined || data === null) return "";
              if (typeof data === "boolean") return data ? "Yes" : "No";
              if (Array.isArray(data)) return data.join(", ");
              return String(data);
            },
          });
        }
      }
      return fieldColumns;
    })(),
  ];

  // Use server-provided counts to avoid UI flicker during refetch
  const totalRecipients = request?.recipientCount ?? recipientRows.length;
  const serverRespondedCount = request?.respondedCount ?? recipientRows.filter((r) => r.status === "responded").length;
  const pendingCount = totalRecipients - serverRespondedCount;

  if (isAuthLoading || isLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Forms" },
          { label: "Requests", href: "/forms/requests" },
          { label: "Loading..." },
        ]}
      >
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  if (!request) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Forms" },
          { label: "Requests", href: "/forms/requests" },
          { label: "Not Found" },
        ]}
      >
        <div className="p-6 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Request Not Found</h2>
          <p className="text-muted-foreground mb-4">The form request you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/forms/requests")}>
            Back to Requests
          </Button>
        </div>
      </PageLayout>
    );
  }

  const statusInfo = statusConfig[request.status as RequestStatus] || statusConfig.draft;

  const handlePreview = () => {
    window.open(`/form/preview/${id}`, "_blank", "noopener,noreferrer");
  };

  const additionalActions = [
    {
      label: "Preview",
      icon: Eye,
      variant: "outline" as const,
      onClick: handlePreview,
    },
    ...(request.status === "draft" ? [{
      label: "Edit",
      icon: SquarePen,
      variant: "outline" as const,
      onClick: () => navigate(`/forms/requests/${id}/edit`),
    }] : []),
  ];

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Forms" },
        { label: "Requests", href: "/forms/requests" },
        { label: request.title },
      ]}
      primaryAction={request.status === "draft" && pendingCount > 0 ? {
        label: "Send",
        icon: Send,
        variant: "default",
        onClick: () => setSendDialogOpen(true),
      } : undefined}
      additionalActions={additionalActions}
    >
      <div className="">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="px-6 pt-6 border-b">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <FileText className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="form" data-testid="tab-form">
              <FileText className="h-4 w-4 mr-2" />
              Form
            </TabsTrigger>
            <TabsTrigger value="recipients" data-testid="tab-recipients">
              <Users className="h-4 w-4 mr-2" />
              Recipients ({recipientRows.length})
            </TabsTrigger>
            {(request.status === "sent" || request.status === "completed") && (
              <TabsTrigger value="responses" data-testid="tab-responses">
                <ClipboardList className="h-4 w-4 mr-2" />
                Responses ({responseRows.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{request.title}</CardTitle>
                      {request.description && (
                        <CardDescription>{request.description}</CardDescription>
                      )}
                    </div>
                    <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                      <statusInfo.icon className="h-3 w-3" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {request.dueDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Due:</span>
                        <span>{format(new Date(request.dueDate), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    {request.createdAt && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Created:</span>
                        <span>{format(new Date(request.createdAt), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    {request.createdBy && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">By:</span>
                        <span>{request.createdBy.firstName} {request.createdBy.lastName}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recipients</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-medium">{totalRecipients}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending</span>
                    <span className="font-medium">{pendingCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Responded</span>
                    <span className="font-medium text-green-600">{serverRespondedCount}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="form" className="space-y-4 p-6">
            <div className="space-y-4">
              {request.status === "draft" ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    This form is still in draft mode and can be edited.
                  </p>
                  <Button 
                    onClick={() => navigate(`/forms/requests/${id}/edit`)}
                    data-testid="button-edit-form"
                  >
                    <SquarePen className="h-4 w-4 mr-2" />
                    Edit Form
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This form has been sent and can no longer be edited.
                </p>
              )}
              <ReadOnlyFormRenderer schema={(request.formSchema as FormSection[]) || []} />
            </div>
          </TabsContent>

          <TabsContent value="recipients">
            <Card>
              <CardContent className="p-0">
                {recipientRows.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-lg font-medium">No recipients added</p>
                    <p className="text-sm text-muted-foreground">Add recipients to this form request to start collecting responses.</p>
                  </div>
                ) : (
                  <div className="h-[400px]">
                    <AgGridReact
                      theme={gridTheme}
                      rowData={recipientRows}
                      columnDefs={recipientColumnDefs}
                      context={recipientGridContext}
                      getRowId={(params) => params.data?.id || ""}
                      defaultColDef={{
                        sortable: true,
                        filter: true,
                        resizable: true,
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {(request.status === "sent" || request.status === "completed") && (
            <TabsContent value="responses">
              <Card>
                <CardContent className="p-0">
                  {responseRows.length === 0 ? (
                    <div className="py-12 text-center">
                      <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-lg font-medium">No responses yet</p>
                      <p className="text-sm text-muted-foreground">Responses will appear here as recipients submit their forms.</p>
                    </div>
                  ) : (
                    <div className="h-[400px]">
                      <AgGridReact
                        theme={gridTheme}
                        rowData={responseRows}
                        columnDefs={responseColumnDefs}
                        getRowId={(params) => params.data?.id || ""}
                        defaultColDef={{
                          sortable: true,
                          filter: true,
                          resizable: true,
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <AlertDialog open={!!removeRecipient} onOpenChange={(open) => !open && setRemoveRecipient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Recipient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{removeRecipient?.name}" from this request? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeRecipient && removeRecipientMutation.mutate(removeRecipient.token.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Form Request</AlertDialogTitle>
            <AlertDialogDescription>
              Send this form request to {pendingCount} pending recipient(s)? 
              Each will receive an email with a unique link to complete the form.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sendMutation.mutate()}
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
