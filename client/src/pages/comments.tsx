import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { PageLayout } from "@/framework";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, ExternalLink, Building2, Package, Users, FolderOpen } from "lucide-react";
import type { CommentWithAuthor } from "@shared/schema";

const entityTypeLabels: Record<string, { label: string; icon: typeof Building2; href: (id: string) => string }> = {
  venue: { label: "Venue", icon: Building2, href: (id) => `/venues/${id}` },
  vendor: { label: "Vendor", icon: Package, href: (id) => `/vendors/${id}` },
  contact: { label: "Contact", icon: Users, href: (id) => `/contacts/${id}` },
  venue_collection: { label: "Collection", icon: FolderOpen, href: (id) => `/venues/collections/${id}` },
};

export default function CommentsPage() {
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");

  const queryParams = entityTypeFilter !== "all" ? `?entityType=${entityTypeFilter}` : "";
  
  const { data: comments, isLoading, error } = useQuery<CommentWithAuthor[]>({
    queryKey: ["/api/comments", entityTypeFilter],
  });

  const breadcrumbs = [{ label: "Comments" }];

  const getAuthorInitials = (comment: CommentWithAuthor) => {
    if (!comment.createdBy) return "?";
    const first = comment.createdBy.firstName?.[0] || "";
    const last = comment.createdBy.lastName?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  const getAuthorName = (comment: CommentWithAuthor) => {
    if (!comment.createdBy) return "Unknown User";
    return `${comment.createdBy.firstName || ""} ${comment.createdBy.lastName || ""}`.trim() || "Unknown User";
  };

  const getEntityInfo = (entityType: string) => {
    return entityTypeLabels[entityType] || { 
      label: entityType, 
      icon: MessageSquare,
      href: () => "#" 
    };
  };

  if (isLoading) {
    return (
      <PageLayout breadcrumbs={breadcrumbs}>
        <div className="max-w-4xl p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Comments</h1>
            <Skeleton className="h-10 w-40" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout breadcrumbs={breadcrumbs}>
        <div className="max-w-4xl p-4 md:p-6">
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">Failed to load comments</p>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  const filteredComments = entityTypeFilter === "all" 
    ? comments 
    : comments?.filter(c => c.entityType === entityTypeFilter);

  return (
    <PageLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-4xl p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Comments</h1>
          <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
            <SelectTrigger className="w-40" data-testid="select-entity-type-filter">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="venue">Venues</SelectItem>
              <SelectItem value="vendor">Vendors</SelectItem>
              <SelectItem value="contact">Contacts</SelectItem>
              <SelectItem value="venue_collection">Collections</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!filteredComments || filteredComments.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {entityTypeFilter === "all" 
                  ? "No comments yet" 
                  : `No comments on ${entityTypeLabels[entityTypeFilter]?.label?.toLowerCase() || entityTypeFilter}s`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4" data-testid="comments-list">
            {filteredComments.map((comment) => {
              const entityInfo = getEntityInfo(comment.entityType);
              const EntityIcon = entityInfo.icon;
              const isDeleted = !!comment.deletedAt;
              const isEdited = comment.updatedAt && new Date(comment.updatedAt) > new Date(comment.createdAt);

              return (
                <Card key={comment.id} data-testid={`comment-card-${comment.id}`}>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <Link href={`/app/team/${comment.createdById}`}>
                        <Avatar className="h-10 w-10 cursor-pointer">
                          <AvatarImage src={comment.createdBy?.profileImageUrl || undefined} alt={getAuthorName(comment)} />
                          <AvatarFallback>{getAuthorInitials(comment)}</AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Link 
                            href={`/app/team/${comment.createdById}`}
                            className="font-medium text-sm hover:underline"
                            data-testid={`link-author-${comment.id}`}
                          >
                            {getAuthorName(comment)}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                          {isEdited && !isDeleted && (
                            <span className="text-xs text-muted-foreground italic">(edited)</span>
                          )}
                          {comment.parentId && (
                            <Badge variant="outline" className="text-xs">Reply</Badge>
                          )}
                        </div>
                        
                        {isDeleted ? (
                          <p className="text-muted-foreground italic text-sm">
                            This comment has been deleted.
                          </p>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap break-words" data-testid={`text-comment-body-${comment.id}`}>
                            {comment.body}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-3">
                          <Badge variant="secondary" className="gap-1">
                            <EntityIcon className="h-3 w-3" />
                            {entityInfo.label}
                          </Badge>
                          <Link href={entityInfo.href(comment.entityId)}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs"
                              data-testid={`link-entity-${comment.id}`}
                            >
                              View {entityInfo.label}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
