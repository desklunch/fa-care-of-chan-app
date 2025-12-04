import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ThumbsUp, MessageSquare, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import type { AppFeatureWithRelations, FeatureComment, FeatureStatus, FeatureType } from "@shared/schema";

const statusLabels: Record<FeatureStatus, string> = {
  proposed: "Proposed",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  archived: "Archived",
};

const statusColors: Record<FeatureStatus, string> = {
  proposed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  under_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  planned: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  in_progress: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const featureTypeLabels: Record<FeatureType, string> = {
  idea: "Idea",
  requirement: "Requirement",
};

const featureTypeColors: Record<FeatureType, string> = {
  idea: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  requirement: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
};

type FeatureCommentWithUser = FeatureComment & {
  user: { id: string; firstName: string | null; lastName: string | null; profileImageUrl: string | null };
};

function CommentCard({ 
  comment, 
  onDelete,
  canDelete
}: { 
  comment: FeatureCommentWithUser; 
  onDelete: () => void;
  canDelete: boolean;
}) {
  const userName = [comment.user.firstName, comment.user.lastName]
    .filter(Boolean)
    .join(" ") || "Unknown";

  return (
    <div className="flex gap-3 py-4" data-testid={`comment-${comment.id}`}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={comment.user.profileImageUrl || undefined} />
        <AvatarFallback className="text-xs">
          {userName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm" data-testid={`text-comment-author-${comment.id}`}>
              {userName}
            </span>
            <span className="text-xs text-muted-foreground">
              {comment.createdAt ? format(new Date(comment.createdAt), "MMM d, yyyy 'at' h:mm a") : ""}
            </span>
          </div>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onDelete}
              data-testid={`button-delete-comment-${comment.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-sm" data-testid={`text-comment-content-${comment.id}`}>
          {comment.body}
        </p>
      </div>
    </div>
  );
}

export default function AppFeatureDetail() {
  const [, params] = useRoute<{ id: string }>("/app/features/:id");
  const featureId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");

  const { data: feature, isLoading: featureLoading } = useQuery<AppFeatureWithRelations>({
    queryKey: ["/api/features", featureId],
    enabled: !!featureId,
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery<FeatureCommentWithUser[]>({
    queryKey: ["/api/features", featureId, "comments"],
    enabled: !!featureId,
  });

  const voteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/features/${featureId}/vote`);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/features", featureId] });
      const previousFeature = queryClient.getQueryData<AppFeatureWithRelations>(["/api/features", featureId]);
      if (previousFeature) {
        queryClient.setQueryData<AppFeatureWithRelations>(["/api/features", featureId], {
          ...previousFeature,
          voteCount: previousFeature.hasVoted ? previousFeature.voteCount - 1 : previousFeature.voteCount + 1,
          hasVoted: !previousFeature.hasVoted,
        });
      }
      return { previousFeature };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousFeature) {
        queryClient.setQueryData(["/api/features", featureId], context.previousFeature);
      }
      toast({ 
        title: "Failed to vote", 
        description: error.message,
        variant: "destructive" 
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features", featureId] });
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: FeatureStatus) => {
      return apiRequest("PATCH", `/api/features/${featureId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features", featureId] });
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      toast({ title: "Status updated!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update status", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (body: string) => {
      return apiRequest("POST", `/api/features/${featureId}/comments`, { body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features", featureId, "comments"] });
      setCommentText("");
      toast({ title: "Comment added!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to add comment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return apiRequest("DELETE", `/api/features/${featureId}/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features", featureId, "comments"] });
      toast({ title: "Comment deleted!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete comment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const isAdmin = user?.role === "admin";
  const isLoading = featureLoading || commentsLoading;

  if (isLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "App Features", href: "/app/features" }, { label: "Loading..." }]}>
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageLayout>
    );
  }

  if (!feature) {
    return (
      <PageLayout breadcrumbs={[{ label: "App Features", href: "/app/features" }, { label: "Not Found" }]}>
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold">Feature not found</h2>
          <p className="text-muted-foreground mt-2">The feature you're looking for doesn't exist or has been removed.</p>
        </div>
      </PageLayout>
    );
  }

  const createdByName = [feature.createdBy.firstName, feature.createdBy.lastName]
    .filter(Boolean)
    .join(" ") || "Unknown";

  const headerActions = (
    <div className="flex items-center gap-2">
      {(isAdmin || user?.id === feature.createdById) && (
        <Link href={`/app/features/${feature.id}/edit`}>
          <Button
            variant="outline"
            data-testid="button-edit-feature"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </Link>
      )}
    </div>
  );

  return (
    <PageLayout 
      breadcrumbs={[{ label: "App Features", href: "/app/features" }, { label: feature.title }]}
      customHeaderAction={headerActions}
    >
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-2">
                <Badge 
                  variant="outline"
                  style={{ 
                    borderColor: feature.category.color || undefined,
                    color: feature.category.color || undefined 
                  }}
                  data-testid="badge-feature-category"
                >
                  {feature.category.name}
                </Badge>
                <CardTitle className="text-2xl" data-testid="text-feature-title">
                  {feature.title}
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  {feature.featureType && (
                    <Badge 
                      className={featureTypeColors[feature.featureType as FeatureType]}
                      data-testid="badge-feature-type"
                    >
                      {featureTypeLabels[feature.featureType as FeatureType]}
                    </Badge>
                  )}
                  <Badge 
                    className={statusColors[feature.status as FeatureStatus]}
                    data-testid="badge-feature-status"
                  >
                    {statusLabels[feature.status as FeatureStatus]}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={feature.hasVoted ? "default" : "outline"}
                  onClick={() => voteMutation.mutate()}
                  disabled={voteMutation.isPending}
                  className="gap-2"
                  data-testid="button-vote"
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span data-testid="text-vote-count">{feature.voteCount}</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-feature-description">
              {feature.description}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Avatar className="h-6 w-6">
                <AvatarImage src={feature.createdBy.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {createdByName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>Submitted by {createdByName}</span>
              {feature.createdAt && (
                <span>on {format(new Date(feature.createdAt), "MMM d, yyyy")}</span>
              )}
            </div>
          </CardContent>
          {isAdmin && (
            <CardFooter className="border-t pt-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Update Status:</span>
                <Select 
                  value={feature.status} 
                  onValueChange={(value) => statusMutation.mutate(value as FeatureStatus)}
                  disabled={statusMutation.isPending}
                >
                  <SelectTrigger className="w-[180px]" data-testid="select-feature-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardFooter>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Textarea
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[80px]"
                data-testid="textarea-comment"
              />
              <div className="flex justify-end">
                <Button
                  onClick={() => addCommentMutation.mutate(commentText)}
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  data-testid="button-submit-comment"
                >
                  {addCommentMutation.isPending ? "Posting..." : "Post Comment"}
                </Button>
              </div>
            </div>

            {comments.length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="divide-y">
                  {comments.map((comment) => (
                    <CommentCard
                      key={comment.id}
                      comment={comment}
                      onDelete={() => deleteCommentMutation.mutate(comment.id)}
                      canDelete={isAdmin || comment.userId === user?.id}
                    />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
