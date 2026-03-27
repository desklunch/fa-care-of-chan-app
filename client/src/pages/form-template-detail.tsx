import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/use-page-title";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { SquarePen, FileText, Calendar, Layers, Trash2, Copy } from "lucide-react";
import { format } from "date-fns";
import type { FormTemplate, InsertFormTemplate, FormSection, FormField as FormFieldType } from "@shared/schema";

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
    <div className="space-y-6">
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

export default function FormTemplateDetailPage() {
  const [location, navigate] = useProtectedLocation();
  const { id } = useParams<{ id: string }>();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();

  const isDealsContext = location.startsWith("/deals/forms");
  const backPath = isDealsContext ? "/deals/forms" : "/forms";

  const { data: template, isLoading } = useQuery<FormTemplate>({
    queryKey: ["/api/form-templates", id],
    enabled: !!id && isAuthenticated,
  });

  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const duplicateMutation = useMutation({
    mutationFn: async (data: InsertFormTemplate) => {
      const res = await apiRequest("POST", "/api/form-templates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      toast({ title: "Template duplicated", description: "Form template has been duplicated successfully." });
      navigate(backPath);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ variant: "destructive", title: "Session expired", description: "Please log in again." });
        navigate("/");
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to duplicate template." });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      await apiRequest("DELETE", `/api/form-templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      toast({ title: "Template deleted", description: "Form template has been deleted." });
      navigate(backPath);
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

  usePageTitle(template?.name || "Form Template");

  const loadingBreadcrumbs = isDealsContext
    ? [
        { label: "Deals", href: "/deals" },
        { label: "Client Intake Forms", href: "/deals/forms" },
        { label: "Loading..." },
      ]
    : [
        { label: "Forms", href: "/forms" },
        { label: "Loading..." },
      ];

  if (isAuthLoading || isLoading) {
    return (
      <PageLayout breadcrumbs={loadingBreadcrumbs}>
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

  if (!template) {
    const notFoundBreadcrumbs = isDealsContext
      ? [
          { label: "Deals", href: "/deals" },
          { label: "Client Intake Forms", href: "/deals/forms" },
          { label: "Not Found" },
        ]
      : [
          { label: "Forms", href: "/forms" },
          { label: "Not Found" },
        ];

    return (
      <PageLayout breadcrumbs={notFoundBreadcrumbs}>
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium">Template not found</p>
              <p className="text-sm text-muted-foreground mb-4">
                The template you're looking for doesn't exist or has been deleted.
              </p>
              <Button onClick={() => navigate(backPath)}>
                Back to Templates
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  const formSchema = (template.formSchema as FormSection[]) || [];
  const sectionCount = formSchema.length;
  const fieldCount = formSchema.reduce((acc, section) => acc + section.fields.length, 0);

  const detailBreadcrumbs = isDealsContext
    ? [
        { label: "Deals", href: "/deals" },
        { label: "Client Intake Forms", href: "/deals/forms" },
        { label: template.name },
      ]
    : [
        { label: "Forms", href: "/forms" },
        { label: template.name },
      ];

  return (
    <PageLayout
      breadcrumbs={detailBreadcrumbs}
      additionalActions={[
        {
          label: "Edit",
          href: isDealsContext ? `/deals/forms/${id}/edit` : `/forms/${id}/edit`,
          icon: SquarePen,
        },
        {
          label: "Duplicate",
          icon: Copy,
          onClick: () => {
            duplicateMutation.mutate({
              name: `${template.name} (Copy)`,
              description: template.description,
              category: template.category,
              formSchema: template.formSchema,
            } as InsertFormTemplate);
          },
        },
        {
          label: "Delete",
          icon: Trash2,
          variant: "destructive" as const,
          onClick: () => setShowDeleteDialog(true),
        },
      ]}
    >
      <div className="p-6 space-y-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
            <CardDescription>Basic information about this form template.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium" data-testid="text-template-name">{template.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Created</Label>
                <p className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {template.createdAt ? format(new Date(template.createdAt), "MMM d, yyyy") : "—"}
                </p>
              </div>
            </div>
            {template.description && (
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p data-testid="text-template-description">{template.description}</p>
              </div>
            )}
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{sectionCount} section{sectionCount !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{fieldCount} field{fieldCount !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h3 className="text-lg font-semibold mb-4">Form Preview</h3>
          <ReadOnlyFormRenderer schema={formSchema} />
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{template.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(template.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
