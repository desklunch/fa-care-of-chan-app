import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { PageLayout } from "@/framework";
import { FormBuilder } from "@/components/form-builder";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, Loader2 } from "lucide-react";
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
import type {
  FormTemplate,
  InsertFormTemplate,
  FormSection,
} from "@shared/schema";

export default function AdminFormTemplateFormPage() {
  const [location, navigate] = useProtectedLocation();
  const { id } = useParams<{ id?: string }>();
  const { toast } = useToast();
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();

  const isDealsContext = location.startsWith("/deals/forms");
  const backPath = isDealsContext ? "/deals/forms" : "/forms";

  const isEditing = !!id;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(
    isDealsContext && !isEditing ? "client_intake" : "",
  );
  const [formSchema, setFormSchema] = useState<FormSection[]>([]);

  const { data: template, isLoading: isTemplateLoading } =
    useQuery<FormTemplate>({
      queryKey: ["/api/form-templates", id],
      enabled: isAuthenticated && isEditing,
    });

  usePageTitle(isEditing ? "Edit Form Template" : "New Form Template");

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setCategory(template.category || "");
      setFormSchema((template.formSchema as FormSection[]) || []);
    }
  }, [template]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertFormTemplate) => {
      const res = await apiRequest("POST", "/api/form-templates", data);
      return res.json();
    },
    onSuccess: (created: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      toast({
        title: "Template created",
        description: "Form template has been created successfully.",
      });
      const detailPath = isDealsContext
        ? `/deals/forms/${created.id}`
        : `/forms/${created.id}`;
      navigate(detailPath);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          variant: "destructive",
          title: "Session expired",
          description: "Please log in again.",
        });
        navigate("/");
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create template.",
        });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<InsertFormTemplate>;
    }) => {
      const res = await apiRequest("PATCH", `/api/form-templates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates", id] });
      toast({
        title: "Template updated",
        description: "Form template has been updated successfully.",
      });
      const detailPath = isDealsContext
        ? `/deals/forms/${id}`
        : `/forms/${id}`;
      navigate(detailPath);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          variant: "destructive",
          title: "Session expired",
          description: "Please log in again.",
        });
        navigate("/");
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update template.",
        });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      await apiRequest("DELETE", `/api/form-templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      toast({
        title: "Template deleted",
        description: "Form template has been deleted successfully.",
      });
      navigate(backPath);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          variant: "destructive",
          title: "Session expired",
          description: "Please log in again.",
        });
        navigate("/");
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete template.",
        });
      }
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Template name is required.",
      });
      return;
    }
    if (!category) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Please select a category.",
      });
      return;
    }

    const data = {
      name: name.trim(),
      description: description.trim(),
      category: category || null,
      formSchema,
    };

    if (isEditing && id) {
      updateMutation.mutate({ id, data });
    } else {
      createMutation.mutate(data as InsertFormTemplate);
    }
  };

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const primaryAction = {
    label: isEditing ? "Update Template" : "Create Template",
    icon: Save,
    variant: "default" as const,
    onClick: handleSave,
  };

  const additionalActions = [
    {
      label: "Cancel",
      icon: X,
      variant: "outline" as const,
      onClick: () => navigate(backPath),
    },
  ];

  const breadcrumbs = isDealsContext
    ? [
        { label: "Deals", href: "/deals" },
        { label: "Intake Forms", href: "/deals/forms" },
        { label: isEditing ? "Edit" : "New" },
      ]
    : [
        { label: "Forms", href: "/forms" },
        { label: isEditing ? "Edit" : "New" },
      ];

  if (isAuthLoading) {
    return (
      <PageLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  if (isEditing && isTemplateLoading) {
    return (
      <PageLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      primaryAction={primaryAction}
      additionalActions={additionalActions}
    >
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Template Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="space-y-2 w-full">
                <Label htmlFor="template-name">Template Name *</Label>
                <Input
                  id="template-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter template name"
                  data-testid="input-template-name"
                />
              </div>
              {!(isDealsContext && !isEditing) && (
                <div className="space-y-2 w-full">
                  <Label htmlFor="template-category">Category</Label>
                  <Select
                    value={category}
                    onValueChange={setCategory}
                    data-testid="select-template-category"
                  >
                    <SelectTrigger
                      id="template-category"
                      data-testid="select-template-category"
                    >
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="client_intake"
                        data-testid="option-category-client-intake"
                      >
                        Client Intake
                      </SelectItem>
                      <SelectItem
                        value="vendor_inquiry"
                        data-testid="option-category-vendor-inquiry"
                      >
                        Vendor Inquiry
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Form Structure</CardTitle>
            <CardDescription>
              Design the form by adding sections and fields. Drag to reorder.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormBuilder value={formSchema} onChange={setFormSchema} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => navigate(backPath)}
            disabled={isPending}
            data-testid="button-cancel-template"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || isPending}
            data-testid="button-submit-template"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEditing ? "Update Template" : "Create Template"}
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this form template? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => id && deleteMutation.mutate(id)}
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
