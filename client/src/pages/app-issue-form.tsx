import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Save, X, Trash2, AlertCircle, AlertTriangle, Info } from "lucide-react";
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
import type { AppIssueWithRelations, IssueSeverity } from "@shared/schema";
import { z } from "zod";

const issueFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200, "Title must be less than 200 characters"),
  description: z.string().min(20, "Description must be at least 20 characters").max(5000, "Description must be less than 5000 characters"),
  severity: z.enum(["high", "medium", "low"]),
});

type FormData = z.infer<typeof issueFormSchema>;

const severityLabels: Record<IssueSeverity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const severityIcons: Record<IssueSeverity, typeof AlertCircle> = {
  high: AlertCircle,
  medium: AlertTriangle,
  low: Info,
};

const severities: IssueSeverity[] = ["high", "medium", "low"];

export default function AppIssueForm() {
  const [, setLocation] = useProtectedLocation();
  const [matchNew] = useRoute("/app/issues/new");
  const [matchEdit, editParams] = useRoute<{ id: string }>("/app/issues/:id/edit");
  
  const isEditMode = !!matchEdit;
  const issueId = editParams?.id;
  const { toast } = useToast();

  const { data: existingIssue, isLoading: issueLoading } = useQuery<AppIssueWithRelations>({
    queryKey: ["/api/app-issues", issueId],
    enabled: isEditMode && !!issueId,
  });

  usePageTitle(isEditMode ? "Edit Issue" : "Report Issue");

  const form = useForm<FormData>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: {
      title: "",
      description: "",
      severity: "medium",
    },
  });

  useEffect(() => {
    if (isEditMode && existingIssue) {
      form.reset({
        title: existingIssue.title,
        description: existingIssue.description,
        severity: existingIssue.severity as IssueSeverity,
      });
    }
  }, [isEditMode, existingIssue, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/app-issues", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-issues"] });
      toast({ title: "Issue reported successfully!" });
      setLocation("/app/issues");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to report issue", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("PATCH", `/api/app-issues/${issueId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/app-issues", issueId] });
      toast({ title: "Issue updated successfully!" });
      setLocation(`/app/issues/${issueId}`);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update issue", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/app-issues/${issueId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-issues"] });
      toast({ title: "Issue deleted successfully!" });
      setLocation("/app/issues");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete issue", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const isLoading = isEditMode && issueLoading;

  const handleHeaderSubmit = () => {
    form.handleSubmit(onSubmit)();
  };

  const handleCancel = () => {
    setLocation(isEditMode && issueId ? `/app/issues/${issueId}` : "/app/issues");
  };

  if (isLoading) {
    return (
      <PageLayout 
        breadcrumbs={[
          { label: "App" }, 
          { label: "Issues", href: "/app/issues" },
          { label: isEditMode ? "Edit" : "Report" }
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      breadcrumbs={[
        { label: "App" }, 
        { label: "Issues", href: "/app/issues" },
        ...(isEditMode && existingIssue ? [{ label: existingIssue.title, href: `/app/issues/${issueId}` }] : []),
        { label: isEditMode ? "Edit" : "Report" }
      ]}
      primaryAction={{
        label: isEditMode ? "Update Issue" : "Submit Report",
        icon: Save,
        onClick: handleHeaderSubmit,
      }}
      additionalActions={[
        {
          label: "Cancel",
          icon: X,
          onClick: handleCancel,
        },
      ]}
    >
      <div className="max-w-2xl p-4 md:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-form-title">
                  {isEditMode ? "Edit Issue Report" : "Issue Info"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <div className="w-full flex justify-between items-center gap-2">
                        <FormLabel>Title</FormLabel>
                        <span className="text-xs font-medium text-muted-foreground">Required</span>
                      </div>
                      <FormControl>
                        <Input 
                          placeholder="Brief description of the issue" 
                          {...field} 
                          data-testid="input-issue-title"
                        />
                      </FormControl>
                      <FormDescription>
                        A clear and concise title for the issue.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <div className="w-full flex justify-between items-center gap-2">
                        <FormLabel>Severity</FormLabel>
                        <span className="text-xs font-medium text-muted-foreground">Required</span>
                      </div>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-issue-severity">
                            <SelectValue placeholder="Select severity level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {severities.map((severity) => {
                            const Icon = severityIcons[severity];
                            return (
                              <SelectItem key={severity} value={severity} data-testid={`select-option-severity-${severity}`}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  <span>{severityLabels[severity]}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How severe is this issue?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <div className="w-full flex justify-between items-center gap-2">
                        <FormLabel>Description</FormLabel>
                        <span className="text-xs font-medium text-muted-foreground">Required</span>
                      </div>
                      <FormControl>
                        <Textarea 
                          placeholder="Please describe the issue in detail. Include steps to reproduce, expected behavior, and actual behavior."
                          className="min-h-[150px]"
                          {...field} 
                          data-testid="textarea-issue-description"
                        />
                      </FormControl>
                      <FormDescription>
                        Include as much detail as possible to help us understand and fix the issue.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-between gap-3 flex-wrap">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isPending}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  data-testid="button-submit-issue"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isEditMode ? "Update Issue" : "Submit Report"}
                </Button>
              </div>
              {isEditMode && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      type="button" 
                      variant="destructive"
                      disabled={isPending}
                      data-testid="button-delete-issue"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Issue</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this issue? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-testid="button-confirm-delete"
                      >
                        {deleteMutation.isPending ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </form>
        </Form>
      </div>
    </PageLayout>
  );
}
