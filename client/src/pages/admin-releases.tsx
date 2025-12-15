import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
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
  DialogTrigger,
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
import { Loader2, Plus, Rocket, Pencil, Trash2, Tag } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { AppRelease } from "@shared/schema";

const createReleaseSchema = z.object({
  versionLabel: z
    .string()
    .min(1, "Version label is required")
    .regex(/^V?\d+(\.\d+)*$/, "Version must be in format V1.0.0 or 1.0.0"),
  title: z.string().max(200).optional(),
  releaseNotes: z.string().optional(),
});

type CreateReleaseData = z.infer<typeof createReleaseSchema>;

export default function AdminReleases() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteReleaseId, setDeleteReleaseId] = useState<string | null>(null);

  const { data: releases, isLoading } = useQuery<AppRelease[]>({
    queryKey: ["/api/releases"],
  });

  const form = useForm<CreateReleaseData>({
    resolver: zodResolver(createReleaseSchema),
    defaultValues: {
      versionLabel: "",
      title: "",
      releaseNotes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateReleaseData) => {
      const response = await apiRequest("POST", "/api/releases", data);
      return response.json();
    },
    onSuccess: (release) => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
      toast({
        title: "Release created",
        description: `Version ${release.versionLabel} created as draft`,
      });
      setIsCreateDialogOpen(false);
      form.reset();
      navigate(`/admin/releases/${release.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create release",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/releases/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
      toast({
        title: "Release deleted",
      });
      setDeleteReleaseId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete release",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateReleaseData) => {
    createMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const draftReleases = releases?.filter((r) => r.status === "draft") || [];
  const publishedReleases = releases?.filter((r) => r.status === "released") || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            Release Management
          </h1>
          <p className="text-muted-foreground">
            Manage app versions and track changes across releases
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-release">
              <Plus className="h-4 w-4 mr-2" />
              New Release
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Release</DialogTitle>
              <DialogDescription>
                Create a new version to track features and changes
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="versionLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Version Label</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="V1.0.0"
                          {...field}
                          data-testid="input-version-label"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Initial Release"
                          {...field}
                          data-testid="input-release-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="releaseNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Release Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Summary of this release..."
                          className="min-h-[100px]"
                          {...field}
                          data-testid="input-release-notes"
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
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-submit-create"
                  >
                    {createMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Create Draft
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {draftReleases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Draft Releases
            </CardTitle>
            <CardDescription>
              Releases in progress that haven't been published yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {draftReleases.map((release) => (
                <div
                  key={release.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer"
                  onClick={() => navigate(`/admin/releases/${release.id}`)}
                  data-testid={`card-release-${release.id}`}
                >
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" data-testid={`badge-version-${release.id}`}>
                      {release.versionLabel}
                    </Badge>
                    <div>
                      <div className="font-medium">
                        {release.title || "Untitled Release"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Created {format(new Date(release.createdAt!), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Draft</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteReleaseId(release.id);
                      }}
                      data-testid={`button-delete-${release.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Published Releases
          </CardTitle>
          <CardDescription>
            Released versions with their change logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {publishedReleases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No releases published yet</p>
              <p className="text-sm">Create and publish your first release</p>
            </div>
          ) : (
            <div className="space-y-3">
              {publishedReleases.map((release) => (
                <div
                  key={release.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer"
                  onClick={() => navigate(`/admin/releases/${release.id}`)}
                  data-testid={`card-release-${release.id}`}
                >
                  <div className="flex items-center gap-4">
                    <Badge data-testid={`badge-version-${release.id}`}>
                      {release.versionLabel}
                    </Badge>
                    <div>
                      <div className="font-medium">
                        {release.title || "Untitled Release"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Released{" "}
                        {release.releaseDate
                          ? format(new Date(release.releaseDate), "MMM d, yyyy")
                          : "—"}
                      </div>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-green-600">
                    Published
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteReleaseId} onOpenChange={() => setDeleteReleaseId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Release</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this draft release? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteReleaseId(null)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteReleaseId && deleteMutation.mutate(deleteReleaseId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
