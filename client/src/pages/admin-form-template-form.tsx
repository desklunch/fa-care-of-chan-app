import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card } from "@/components/ui/card";
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
import { ArrowLeft } from "lucide-react";
import type { FormTemplate, InsertFormTemplate, FormSection } from "@shared/schema";

export default function AdminFormTemplateFormPage() {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id?: string }>();
  const { toast } = useToast();
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();

  const isEditing = !!id;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formSchema, setFormSchema] = useState<FormSection[]>([]);

  const { data: template, isLoading: isTemplateLoading } = useQuery<FormTemplate>({
    queryKey: ["/api/form-templates", id],
    enabled: isAuthenticated && user?.role === "admin" && isEditing,
  });

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setFormSchema((template.formSchema as FormSection[]) || []);
    }
  }, [template]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertFormTemplate) => {
      const res = await apiRequest("POST", "/api/form-templates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      toast({ title: "Template created", description: "Form template has been created successfully." });
      navigate("/admin/forms/templates");
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
      toast({ title: "Template updated", description: "Form template has been updated successfully." });
      navigate("/admin/forms/templates");
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

  const handleSave = () => {
    if (!name.trim()) return;
    
    const data = {
      name: name.trim(),
      description: description.trim(),
      formSchema,
    };

    if (isEditing && id) {
      updateMutation.mutate({ id, data });
    } else {
      createMutation.mutate(data as InsertFormTemplate);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isAuthLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Admin" }, { label: "Form Templates" }, { label: isEditing ? "Edit" : "New" }]}>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    navigate("/");
    return null;
  }

  if (isEditing && isTemplateLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Admin" }, { label: "Form Templates" }, { label: "Edit" }]}>
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
      breadcrumbs={[
        { label: "Admin" },
        { label: "Form Templates", href: "/admin/forms/templates" },
        { label: isEditing ? "Edit Template" : "New Template" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/forms/templates")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              {isEditing ? "Edit Template" : "Create Template"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? "Update your form template details and structure."
                : "Create a new form template with custom sections and fields."}
            </p>
          </div>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/forms/templates")}
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
            {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Template"}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
