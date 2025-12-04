import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { FormBuilder } from "@/components/form-builder";
import {
  Plus,
  Send,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Building,
  User,
  Mail,
} from "lucide-react";
import type {
  FormRequest,
  FormTemplate,
  FormSection,
  InsertFormRequest,
  Vendor,
  Contact,
  OutreachToken,
  RecipientType,
} from "@shared/schema";
import { format } from "date-fns";

type RequestStatus = "draft" | "sent" | "completed";

const statusConfig: Record<RequestStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  sent: { label: "Sent", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
};

function RequestCard({
  request,
  onEdit,
  onDelete,
  onSend,
  onManageRecipients,
}: {
  request: FormRequest;
  onEdit: () => void;
  onDelete: () => void;
  onSend: () => void;
  onManageRecipients: () => void;
}) {
  const fieldCount = (request.formSchema as FormSection[]).reduce(
    (acc, section) => acc + section.fields.length,
    0
  );
  const tokens = (request as FormRequest & { tokens?: OutreachToken[] }).tokens || [];
  const pendingCount = tokens.filter((t) => t.status === "pending").length;
  const respondedCount = tokens.filter((t) => t.status === "responded").length;

  return (
    <Card
      className="p-4 hover-elevate cursor-pointer transition-shadow"
      onClick={onEdit}
      data-testid={`card-request-${request.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <h3 className="font-semibold truncate">{request.title}</h3>
            <Badge variant={statusConfig[request.status as RequestStatus]?.variant || "secondary"}>
              {statusConfig[request.status as RequestStatus]?.label || request.status}
            </Badge>
          </div>
          {request.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {request.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {tokens.length} recipient{tokens.length !== 1 ? "s" : ""}
            </span>
            {respondedCount > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-3 w-3" />
                {respondedCount} responded
              </span>
            )}
            {request.dueDate && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Due {format(new Date(request.dueDate), "MMM d")}
              </span>
            )}
            {request.createdAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(request.createdAt), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" data-testid={`button-request-menu-${request.id}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onManageRecipients(); }}>
              <Users className="h-4 w-4 mr-2" />
              Manage Recipients
            </DropdownMenuItem>
            {request.status === "draft" && pendingCount > 0 && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSend(); }}>
                <Send className="h-4 w-4 mr-2" />
                Send to Recipients
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}

interface RequestFormData {
  title: string;
  description: string;
  formSchema: FormSection[];
  dueDate: string | null;
}

function RequestEditorDialog({
  request,
  templates,
  open,
  onOpenChange,
  onSave,
  isPending,
}: {
  request: FormRequest | null;
  templates: FormTemplate[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: RequestFormData) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(request?.title || "");
  const [description, setDescription] = useState(request?.description || "");
  const [formSchema, setFormSchema] = useState<FormSection[]>(
    (request?.formSchema as FormSection[]) || []
  );
  const [dueDate, setDueDate] = useState(
    request?.dueDate ? format(new Date(request.dueDate), "yyyy-MM-dd") : ""
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      formSchema,
      dueDate: dueDate || null,
    });
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setFormSchema((template.formSchema as FormSection[]) || []);
      setSelectedTemplateId(templateId);
    }
  };

  useEffect(() => {
    if (request) {
      setTitle(request.title);
      setDescription(request.description || "");
      setFormSchema((request.formSchema as FormSection[]) || []);
      setDueDate(request.dueDate ? format(new Date(request.dueDate), "yyyy-MM-dd") : "");
    } else {
      setTitle("");
      setDescription("");
      setFormSchema([]);
      setDueDate("");
      setSelectedTemplateId("");
    }
  }, [request, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{request ? "Edit Request" : "Create Form Request"}</DialogTitle>
          <DialogDescription>
            {request
              ? "Update your form request details and structure."
              : "Create a new form request to send to vendors or contacts."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="request-title">Request Title</Label>
              <Input
                id="request-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter request title"
                data-testid="input-request-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-due-date">Due Date (Optional)</Label>
              <Input
                id="request-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                data-testid="input-request-due-date"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="request-description">Description (Optional)</Label>
            <Textarea
              id="request-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this request"
              className="resize-none"
              rows={3}
              data-testid="textarea-request-description"
            />
          </div>

          {!request && templates.length > 0 && (
            <div className="space-y-2">
              <Label>Start from Template (Optional)</Label>
              <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                <SelectTrigger data-testid="select-template">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Form Structure</Label>
            <FormBuilder value={formSchema} onChange={setFormSchema} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            data-testid="button-cancel-request"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || isPending}
            data-testid="button-save-request"
          >
            {isPending ? "Saving..." : request ? "Save Changes" : "Create Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<FormRequest | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<FormRequest | null>(null);
  const [recipientRequest, setRecipientRequest] = useState<FormRequest | null>(null);
  const [sendRequest, setSendRequest] = useState<FormRequest | null>(null);

  const { data: requests = [], isLoading } = useQuery<FormRequest[]>({
    queryKey: ["/api/form-requests"],
    enabled: isAuthenticated && user?.role === "admin",
  });

  const { data: templates = [] } = useQuery<FormTemplate[]>({
    queryKey: ["/api/form-templates"],
    enabled: isAuthenticated && user?.role === "admin",
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertFormRequest) => {
      const res = await apiRequest("POST", "/api/form-requests", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-requests"] });
      setIsEditorOpen(false);
      toast({ title: "Request created", description: "Form request has been created successfully." });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ variant: "destructive", title: "Session expired", description: "Please log in again." });
        navigate("/");
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to create request." });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertFormRequest> }) => {
      const res = await apiRequest("PATCH", `/api/form-requests/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-requests"] });
      setIsEditorOpen(false);
      setEditingRequest(null);
      toast({ title: "Request updated", description: "Form request has been updated successfully." });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ variant: "destructive", title: "Session expired", description: "Please log in again." });
        navigate("/");
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to update request." });
      }
    },
  });

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
        title: "Request sent",
        description: `Successfully sent to ${data.sentCount} recipient(s).`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ variant: "destructive", title: "Session expired", description: "Please log in again." });
        navigate("/");
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to send request." });
      }
    },
  });

  const handleSave = (data: RequestFormData) => {
    const payload = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    };
    if (editingRequest) {
      updateMutation.mutate({ id: editingRequest.id, data: payload });
    } else {
      createMutation.mutate(payload as InsertFormRequest);
    }
  };

  const handleEdit = (request: FormRequest) => {
    setEditingRequest(request);
    setIsEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingRequest(null);
    setIsEditorOpen(true);
  };

  if (isAuthLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Admin" }, { label: "Form Requests" }]}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
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
        onClick: handleCreate,
        icon: Plus,
        variant: "default",
      }}
    >
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center">
          <Send className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No form requests yet</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
            Form requests let you collect information from vendors and contacts through custom forms.
          </p>
          <Button onClick={handleCreate} data-testid="button-create-first-request">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Request
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onEdit={() => handleEdit(request)}
              onDelete={() => setDeleteRequest(request)}
              onSend={() => setSendRequest(request)}
              onManageRecipients={() => setRecipientRequest(request)}
            />
          ))}
        </div>
      )}

      <RequestEditorDialog
        request={editingRequest}
        templates={templates}
        open={isEditorOpen}
        onOpenChange={(open) => {
          setIsEditorOpen(open);
          if (!open) setEditingRequest(null);
        }}
        onSave={handleSave}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <RecipientSelectorDialog
        request={recipientRequest}
        open={!!recipientRequest}
        onOpenChange={(open) => !open && setRecipientRequest(null)}
        onSave={(recipients) =>
          recipientRequest && addRecipientsMutation.mutate({ id: recipientRequest.id, recipients })
        }
        isPending={addRecipientsMutation.isPending}
      />

      <AlertDialog open={!!deleteRequest} onOpenChange={(open) => !open && setDeleteRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteRequest?.title}"? This action cannot be undone.
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
              This will send emails with unique form links to all pending recipients. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => sendRequest && sendMutation.mutate(sendRequest.id)}>
              <Send className="h-4 w-4 mr-2" />
              Send Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
