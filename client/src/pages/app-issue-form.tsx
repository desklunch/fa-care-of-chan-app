import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { AppIssue, IssueSeverity } from "@shared/schema";

const issueFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200, "Title must be less than 200 characters"),
  description: z.string().min(20, "Description must be at least 20 characters").max(5000, "Description must be less than 5000 characters"),
  severity: z.enum(["high", "medium", "low"]),
});

type IssueFormValues = z.infer<typeof issueFormSchema>;

const severityOptions: { value: IssueSeverity; label: string; description: string; icon: typeof AlertCircle }[] = [
  { 
    value: "high", 
    label: "High", 
    icon: AlertCircle,
  },
  { 
    value: "medium", 
    label: "Medium", 
    icon: AlertTriangle,
  },
  { 
    value: "low", 
    label: "Low", 
    icon: Info,
  },
];

export default function AppIssueForm() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEditing = id && id !== "new";

  const { data: issue, isLoading: issueLoading } = useQuery<AppIssue>({
    queryKey: ["/api/app-issues", id],
    enabled: !!isEditing,
  });

  const form = useForm<IssueFormValues>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: {
      title: "",
      description: "",
      severity: "medium",
    },
    values: issue ? {
      title: issue.title,
      description: issue.description,
      severity: issue.severity as IssueSeverity,
    } : undefined,
  });

  const createMutation = useMutation({
    mutationFn: async (data: IssueFormValues) => {
      return apiRequest("POST", "/api/app-issues", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-issues"] });
      toast({ title: "Issue reported successfully" });
      navigate("/app/issues");
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
    mutationFn: async (data: IssueFormValues) => {
      return apiRequest("PATCH", `/api/app-issues/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/app-issues", id] });
      toast({ title: "Issue updated successfully" });
      navigate(`/app/issues/${id}`);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update issue", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: IssueFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isEditing && issueLoading) {
    return (
      <PageLayout 
        breadcrumbs={[
          { label: "App", href: "/app/issues" },
          { label: "Loading..." },
        ]}
      >
        <div className="p-6 space-y-6 max-w-2xl">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      breadcrumbs={[
        { label: "App"}, { label: "Issues", href: "/app/issues" },
        { label: isEditing ? "Edit" : "Report" },
      ]}
    >
      <div className="p-0 md:p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Issue" : "Report a Bug or Issue"}</CardTitle>
            <CardDescription>
              {isEditing 
                ? "Update the details of this issue report."
                : "Help us improve by reporting bugs, issues, or problems you've encountered."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Brief description of the issue" 
                          data-testid="input-issue-title"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        A clear and concise title for the issue
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
                      <FormLabel>Severity</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-issue-severity">
                            <SelectValue placeholder="Select severity level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {severityOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <option.icon className="h-4 w-4" />
                                <span>{option.label}</span>
   
                              </div>
                            </SelectItem>
                          ))}
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Please describe the issue in detail. Include steps to reproduce, expected behavior, and actual behavior."
                          className="min-h-[150px] resize-none text-sm"
                          data-testid="textarea-issue-description"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Include as much detail as possible to help us understand and fix the issue
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    data-testid="button-submit-issue"
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? "Update Issue" : "Submit Report"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => navigate(isEditing ? `/app/issues/${id}` : "/app/issues")}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
