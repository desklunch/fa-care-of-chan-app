import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FormBuilder } from "@/components/form-builder";
import {
  Plus,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Calendar,
  Layers,
} from "lucide-react";
import type { FormTemplate, FormSection, InsertFormTemplate } from "@shared/schema";
import { format } from "date-fns";

function TemplateCard({
  template,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  template: FormTemplate;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const fieldCount = (template.formSchema as FormSection[]).reduce(
    (acc, section) => acc + section.fields.length,
    0
  );
  const sectionCount = (template.formSchema as FormSection[]).length;

  return (
    <Card
      className="p-4 hover-elevate cursor-pointer transition-shadow"
      onClick={onEdit}
      data-testid={`card-template-${template.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <h3 className="font-semibold truncate">{template.name}</h3>
          </div>
          {template.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {template.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {sectionCount} section{sectionCount !== 1 ? "s" : ""}
            </span>
            <span>{fieldCount} field{fieldCount !== 1 ? "s" : ""}</span>
            {template.createdAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(template.createdAt), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" data-testid={`button-template-menu-${template.id}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
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

interface TemplateFormData {
  name: string;
  description: string;
  formSchema: FormSection[];
}

function TemplateEditorDialog({
  template,
  open,
  onOpenChange,
  onSave,
  isPending,
}: {
  template: FormTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: TemplateFormData) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [formSchema, setFormSchema] = useState<FormSection[]>(
    (template?.formSchema as FormSection[]) || []
  );

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), formSchema });
  };

  if (template && (!name && !formSchema.length)) {
    setName(template.name);
    setDescription(template.description || "");
    setFormSchema((template.formSchema as FormSection[]) || []);
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "Create Template"}</DialogTitle>
          <DialogDescription>
            {template
              ? "Update your form template details and structure."
              : "Create a new form template with custom sections and fields."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter template name"
                data-testid="input-template-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description (Optional)</Label>
              <Textarea
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this template"
                className="resize-none"
                rows={3}
                data-testid="textarea-template-description"
              />
            </div>
          </div>

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
            data-testid="button-cancel-template"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || isPending}
            data-testid="button-save-template"
          >
            {isPending ? "Saving..." : template ? "Save Changes" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminFormTemplatesPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<FormTemplate | null>(null);

  const { data: templates = [], isLoading } = useQuery<FormTemplate[]>({
    queryKey: ["/api/form-templates"],
    enabled: isAuthenticated && user?.role === "admin",
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertFormTemplate) => {
      const res = await apiRequest("POST", "/api/form-templates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      setIsEditorOpen(false);
      toast({ title: "Template created", description: "Form template has been created successfully." });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ variant: "destructive", title: "Session expired", description: "Please log in again." });
        navigate("/");
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to create template." });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertFormTemplate> }) => {
      const res = await apiRequest("PATCH", `/api/form-templates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      setIsEditorOpen(false);
      setEditingTemplate(null);
      toast({ title: "Template updated", description: "Form template has been updated successfully." });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ variant: "destructive", title: "Session expired", description: "Please log in again." });
        navigate("/");
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to update template." });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/form-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      setDeleteTemplate(null);
      toast({ title: "Template deleted", description: "Form template has been deleted." });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ variant: "destructive", title: "Session expired", description: "Please log in again." });
        navigate("/");
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete template." });
      }
    },
  });

  const handleSave = (data: TemplateFormData) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data as InsertFormTemplate);
    }
  };

  const handleDuplicate = (template: FormTemplate) => {
    createMutation.mutate({
      name: `${template.name} (Copy)`,
      description: template.description,
      formSchema: template.formSchema,
    } as InsertFormTemplate);
  };

  const handleEdit = (template: FormTemplate) => {
    setEditingTemplate(template);
    setIsEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsEditorOpen(true);
  };

  if (isAuthLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Admin" }, { label: "Form Templates" }]}>
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
      breadcrumbs={[{ label: "Admin" }, { label: "Form Templates" }]}
      actionButton={{
        label: "Create Template",
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
      ) : templates.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No form templates yet</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
            Form templates let you create reusable form structures for collecting information from vendors and contacts.
          </p>
          <Button onClick={handleCreate} data-testid="button-create-first-template">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Template
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => handleEdit(template)}
              onDuplicate={() => handleDuplicate(template)}
              onDelete={() => setDeleteTemplate(template)}
            />
          ))}
        </div>
      )}

      <TemplateEditorDialog
        template={editingTemplate}
        open={isEditorOpen}
        onOpenChange={(open) => {
          setIsEditorOpen(open);
          if (!open) setEditingTemplate(null);
        }}
        onSave={handleSave}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={!!deleteTemplate} onOpenChange={(open) => !open && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTemplate && deleteMutation.mutate(deleteTemplate.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
