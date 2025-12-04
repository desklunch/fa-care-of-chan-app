import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FormBuilder } from "@/components/form-builder";
import { Save } from "lucide-react";
import type {
  FormRequest,
  FormTemplate,
  FormSection,
  InsertFormRequest,
} from "@shared/schema";
import { format } from "date-fns";

export default function AdminFormRequestFormPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const { toast } = useToast();
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();

  const isEditing = !!params.id;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formSchema, setFormSchema] = useState<FormSection[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const { data: existingRequest, isLoading: isLoadingRequest } = useQuery<FormRequest>({
    queryKey: ["/api/form-requests", params.id],
    enabled: isEditing && isAuthenticated,
  });

  const { data: templates = [] } = useQuery<FormTemplate[]>({
    queryKey: ["/api/form-templates"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (existingRequest) {
      setTitle(existingRequest.title);
      setDescription(existingRequest.description || "");
      setFormSchema((existingRequest.formSchema as FormSection[]) || []);
      setDueDate(existingRequest.dueDate ? format(new Date(existingRequest.dueDate), "yyyy-MM-dd") : "");
    }
  }, [existingRequest]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertFormRequest) => {
      const res = await apiRequest("POST", "/api/form-requests", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-requests"] });
      toast({ title: "Request created", description: "Form request has been created successfully." });
      navigate("/forms/requests");
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
      queryClient.invalidateQueries({ queryKey: ["/api/form-requests", params.id] });
      toast({ title: "Request updated", description: "Form request has been updated successfully." });
      navigate("/forms/requests");
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

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setFormSchema((template.formSchema as FormSection[]) || []);
      setSelectedTemplateId(templateId);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast({ variant: "destructive", title: "Validation error", description: "Title is required." });
      return;
    }

    const data = {
      title: title.trim(),
      description: description.trim(),
      formSchema,
      dueDate: dueDate ? new Date(dueDate) : null,
    };

    if (isEditing && params.id) {
      updateMutation.mutate({ id: params.id, data });
    } else {
      createMutation.mutate(data as InsertFormRequest);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const headerAction = (
    <Button
      onClick={handleSave}
      disabled={!title.trim() || isPending}
      data-testid="button-save-request"
      size="sm"
    >
      <Save className="h-4 w-4" />
      {isPending ? "Saving..." : isEditing ? "Save" : "Create"}
    </Button>
  );

  if (isAuthLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Forms" },
          { label: "Requests", href: "/forms/requests" },
          { label: isEditing ? "Edit" : "New" },
        ]}
      >
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

  if (isEditing && isLoadingRequest) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Forms" },
          { label: "Requests", href: "/forms/requests" },
          { label: "Edit" },
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

  const breadcrumbs = isEditing && existingRequest
    ? [
        { label: "Forms" },
        { label: "Requests", href: "/forms/requests" },
        { label: existingRequest.title, href: `/forms/requests/${params.id}` },
        { label: "Edit" },
      ]
    : [
        { label: "Forms" },
        { label: "Requests", href: "/forms/requests" },
        { label: "New Request" },
      ];

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      customHeaderAction={headerAction}
    >
      <div className="p-6 max-w-4xl  space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>Basic information about this form request.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="request-title">Request Title *</Label>
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
          </CardContent>
        </Card>

        {!isEditing && templates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Start from Template</CardTitle>
              <CardDescription>
                Optionally select a template to pre-populate the form structure.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}

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

        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/forms/requests")}
            disabled={isPending}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || isPending}
            data-testid="button-save-request-bottom"
          >
            <Save className="h-4 w-4 mr-2" />
            {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Request"}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
