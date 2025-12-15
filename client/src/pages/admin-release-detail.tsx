import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ArrowLeft,
  Rocket,
  Plus,
  X,
  Sparkles,
  Bug,
  Wrench,
  ListTodo,
  CheckCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { AppReleaseWithDetails, changeTypes } from "@shared/schema";

const addChangeSchema = z.object({
  changeType: z.enum(["feature", "bugfix", "improvement", "task"]),
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().optional(),
});

type AddChangeData = z.infer<typeof addChangeSchema>;

const changeTypeIcons: Record<string, typeof Sparkles> = {
  feature: Sparkles,
  bugfix: Bug,
  improvement: Wrench,
  task: ListTodo,
};

const changeTypeLabels: Record<string, string> = {
  feature: "Feature",
  bugfix: "Bug Fix",
  improvement: "Improvement",
  task: "Task",
};

export default function AdminReleaseDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isAddChangeOpen, setIsAddChangeOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isAddSuggestionsOpen, setIsAddSuggestionsOpen] = useState(false);

  const { data: release, isLoading } = useQuery<AppReleaseWithDetails>({
    queryKey: ["/api/releases", params.id],
  });

  const { data: suggestedFeatures } = useQuery<
    { id: string; title: string; completedAt: Date | null }[]
  >({
    queryKey: ["/api/releases/suggestions/features"],
  });

  const { data: suggestedIssues } = useQuery<
    { id: string; title: string; fixedAt: Date | null }[]
  >({
    queryKey: ["/api/releases/suggestions/issues"],
  });

  const form = useForm<AddChangeData>({
    resolver: zodResolver(addChangeSchema),
    defaultValues: {
      changeType: "improvement",
      title: "",
      description: "",
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/releases/${params.id}/publish`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/releases", params.id] });
      toast({
        title: "Release published",
        description: `${release?.versionLabel} is now live`,
      });
      setIsPublishOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to publish release",
        variant: "destructive",
      });
    },
  });

  const addChangeMutation = useMutation({
    mutationFn: async (data: AddChangeData) => {
      const response = await apiRequest(
        "POST",
        `/api/releases/${params.id}/changes`,
        data
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases", params.id] });
      toast({ title: "Change added" });
      setIsAddChangeOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add change",
        variant: "destructive",
      });
    },
  });

  const removeChangeMutation = useMutation({
    mutationFn: async (changeId: string) => {
      await apiRequest("DELETE", `/api/releases/${params.id}/changes/${changeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases", params.id] });
      toast({ title: "Change removed" });
    },
  });

  const addFeatureMutation = useMutation({
    mutationFn: async (featureId: string) => {
      const response = await apiRequest(
        "POST",
        `/api/releases/${params.id}/features`,
        { featureId }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/releases/suggestions/features"] });
      toast({ title: "Feature added to release" });
    },
  });

  const removeFeatureMutation = useMutation({
    mutationFn: async (featureId: string) => {
      await apiRequest("DELETE", `/api/releases/${params.id}/features/${featureId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/releases/suggestions/features"] });
      toast({ title: "Feature removed from release" });
    },
  });

  const addIssueMutation = useMutation({
    mutationFn: async (issueId: string) => {
      const response = await apiRequest(
        "POST",
        `/api/releases/${params.id}/issues`,
        { issueId }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/releases/suggestions/issues"] });
      toast({ title: "Issue added to release" });
    },
  });

  const removeIssueMutation = useMutation({
    mutationFn: async (issueId: string) => {
      await apiRequest("DELETE", `/api/releases/${params.id}/issues/${issueId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/releases/suggestions/issues"] });
      toast({ title: "Issue removed from release" });
    },
  });

  const onSubmitChange = (data: AddChangeData) => {
    addChangeMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!release) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-muted-foreground">Release not found</p>
      </div>
    );
  }

  const isDraft = release.status === "draft";
  const totalChanges =
    release.features.length + release.issues.length + release.changes.length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/releases")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold" data-testid="text-version-label">
              {release.versionLabel}
            </h1>
            <Badge variant={isDraft ? "secondary" : "default"}>
              {isDraft ? "Draft" : "Published"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {release.title || "Untitled Release"}
          </p>
        </div>
        {isDraft && (
          <Button
            onClick={() => setIsPublishOpen(true)}
            data-testid="button-publish"
          >
            <Rocket className="h-4 w-4 mr-2" />
            Publish Release
          </Button>
        )}
      </div>

      {release.releaseNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Release Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {release.releaseNotes}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Features ({release.features.length})
              </CardTitle>
              <CardDescription>Completed features in this release</CardDescription>
            </div>
            {isDraft && suggestedFeatures && suggestedFeatures.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddSuggestionsOpen(true)}
                data-testid="button-add-suggestions"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {release.features.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No features added yet
              </p>
            ) : (
              <div className="space-y-2">
                {release.features.map((rf) => (
                  <div
                    key={rf.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{rf.feature.title}</span>
                    </div>
                    {isDraft && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFeatureMutation.mutate(rf.featureId)}
                        data-testid={`button-remove-feature-${rf.featureId}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Bug Fixes ({release.issues.length})
              </CardTitle>
              <CardDescription>Fixed issues in this release</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {release.issues.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No bug fixes added yet
              </p>
            ) : (
              <div className="space-y-2">
                {release.issues.map((ri) => (
                  <div
                    key={ri.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Bug className="h-4 w-4 text-red-600" />
                      <span className="text-sm">{ri.issue.title}</span>
                    </div>
                    {isDraft && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeIssueMutation.mutate(ri.issueId)}
                        data-testid={`button-remove-issue-${ri.issueId}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Other Changes ({release.changes.length})
            </CardTitle>
            <CardDescription>
              Additional improvements, tasks, and changes
            </CardDescription>
          </div>
          {isDraft && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddChangeOpen(true)}
              data-testid="button-add-change"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Change
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {release.changes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No additional changes added yet
            </p>
          ) : (
            <div className="space-y-2">
              {release.changes.map((change) => {
                const Icon = changeTypeIcons[change.changeType] || Wrench;
                return (
                  <div
                    key={change.id}
                    className="flex items-center justify-between p-3 border rounded"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{change.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {changeTypeLabels[change.changeType]}
                          </Badge>
                        </div>
                        {change.description && (
                          <p className="text-xs text-muted-foreground">
                            {change.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {isDraft && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeChangeMutation.mutate(change.id)}
                        data-testid={`button-remove-change-${change.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddChangeOpen} onOpenChange={setIsAddChangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Change</DialogTitle>
            <DialogDescription>
              Add a manual change entry to this release
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitChange)} className="space-y-4">
              <FormField
                control={form.control}
                name="changeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Change Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-change-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="improvement">Improvement</SelectItem>
                        <SelectItem value="bugfix">Bug Fix</SelectItem>
                        <SelectItem value="feature">Feature</SelectItem>
                        <SelectItem value="task">Task</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Brief description of the change"
                        {...field}
                        data-testid="input-change-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional details..."
                        {...field}
                        data-testid="input-change-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddChangeOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addChangeMutation.isPending}>
                  {addChangeMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Add Change
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPublishOpen} onOpenChange={setIsPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Release</DialogTitle>
            <DialogDescription>
              Are you sure you want to publish {release.versionLabel}? This action
              cannot be undone and the release will be locked for editing.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This release includes {totalChanges} change
              {totalChanges !== 1 ? "s" : ""}:
            </p>
            <ul className="text-sm mt-2 space-y-1">
              <li>{release.features.length} feature(s)</li>
              <li>{release.issues.length} bug fix(es)</li>
              <li>{release.changes.length} other change(s)</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPublishOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              data-testid="button-confirm-publish"
            >
              {publishMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddSuggestionsOpen} onOpenChange={setIsAddSuggestionsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add to Release</DialogTitle>
            <DialogDescription>
              Select completed features and fixed issues to include in this release
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {suggestedFeatures && suggestedFeatures.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Completed Features
                </h4>
                <div className="space-y-2">
                  {suggestedFeatures.map((feature) => (
                    <div
                      key={feature.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <span className="text-sm">{feature.title}</span>
                      <Button
                        size="sm"
                        onClick={() => addFeatureMutation.mutate(feature.id)}
                        disabled={addFeatureMutation.isPending}
                        data-testid={`button-add-feature-${feature.id}`}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {suggestedIssues && suggestedIssues.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Bug className="h-4 w-4" />
                  Fixed Issues
                </h4>
                <div className="space-y-2">
                  {suggestedIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <span className="text-sm">{issue.title}</span>
                      <Button
                        size="sm"
                        onClick={() => addIssueMutation.mutate(issue.id)}
                        disabled={addIssueMutation.isPending}
                        data-testid={`button-add-issue-${issue.id}`}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(!suggestedFeatures || suggestedFeatures.length === 0) &&
              (!suggestedIssues || suggestedIssues.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No suggestions available
                </p>
              )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSuggestionsOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
