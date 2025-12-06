import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CommentWithAuthor, User } from "@shared/schema";
import { MessageSquare, Reply, Pencil, Trash2, X, Check, CornerDownRight } from "lucide-react";

interface CommentFormProps {
  entityType: string;
  entityId: string;
  parentId?: string;
  onCancel?: () => void;
  onSuccess?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function CommentForm({ 
  entityType, 
  entityId, 
  parentId, 
  onCancel,
  onSuccess,
  placeholder = "Write a comment...",
  autoFocus = false,
}: CommentFormProps) {
  const [body, setBody] = useState("");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: { body: string; entityType: string; entityId: string; parentId?: string }) => {
      return await apiRequest("POST", "/api/comments", data);
    },
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["/api/comments", entityType, entityId] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post comment",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    
    createMutation.mutate({
      body: body.trim(),
      entityType,
      entityId,
      parentId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2" data-testid={parentId ? "form-reply" : "form-comment"}>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        className="min-h-[80px] resize-none"
        autoFocus={autoFocus}
        data-testid={parentId ? "input-reply" : "input-comment"}
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={onCancel}
            data-testid="button-cancel-comment"
          >
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          size="sm" 
          disabled={!body.trim() || createMutation.isPending}
          data-testid="button-submit-comment"
        >
          {createMutation.isPending ? "Posting..." : (parentId ? "Reply" : "Comment")}
        </Button>
      </div>
    </form>
  );
}

interface CommentItemProps {
  comment: CommentWithAuthor;
  currentUserId?: string;
  isAdmin?: boolean;
  entityType: string;
  entityId: string;
  isReply?: boolean;
}

export function CommentItem({ 
  comment, 
  currentUserId, 
  isAdmin, 
  entityType, 
  entityId,
  isReply = false,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [isReplying, setIsReplying] = useState(false);
  const { toast } = useToast();

  const isDeleted = !!comment.deletedAt;
  const isEdited = comment.updatedAt && new Date(comment.updatedAt) > new Date(comment.createdAt);
  const canEdit = currentUserId === comment.createdById && !isDeleted;
  const canDelete = (currentUserId === comment.createdById || isAdmin) && !isDeleted;
  const canReply = !isReply && !isDeleted;

  const updateMutation = useMutation({
    mutationFn: async (data: { body: string }) => {
      return await apiRequest("PATCH", `/api/comments/${comment.id}`, data);
    },
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/comments", entityType, entityId] });
      toast({
        title: "Comment updated",
        description: "Your comment has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update comment",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/comments/${comment.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments", entityType, entityId] });
      toast({
        title: "Comment deleted",
        description: "The comment has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment",
        variant: "destructive",
      });
    },
  });

  const handleSaveEdit = () => {
    if (!editBody.trim()) return;
    updateMutation.mutate({ body: editBody.trim() });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditBody(comment.body);
  };

  const getAuthorInitials = () => {
    if (!comment.createdBy) return "?";
    const first = comment.createdBy.firstName?.[0] || "";
    const last = comment.createdBy.lastName?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  const getAuthorName = () => {
    if (!comment.createdBy) return "Unknown User";
    return `${comment.createdBy.firstName || ""} ${comment.createdBy.lastName || ""}`.trim() || "Unknown User";
  };

  if (isDeleted) {
    return (
      <div 
        className={`flex gap-3 ${isReply ? "pl-10" : ""}`} 
        data-testid={`comment-deleted-${comment.id}`}
      >
        {isReply && <CornerDownRight className="h-4 w-4 text-muted-foreground shrink-0 mt-3" />}
        <div className="flex-1 p-3 rounded-lg bg-muted/50 border border-dashed">
          <p className="text-muted-foreground italic text-sm">
            This comment has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${isReply ? "pl-10" : ""}`} data-testid={`comment-${comment.id}`}>
      <div className="flex gap-3">
        {isReply && <CornerDownRight className="h-4 w-4 text-muted-foreground shrink-0 mt-3" />}
        <Link href={`/app/team/${comment.createdById}`}>
          <Avatar className="h-8 w-8 shrink-0 cursor-pointer">
            <AvatarImage src={comment.createdBy?.profileImageUrl || undefined} alt={getAuthorName()} />
            <AvatarFallback className="text-xs">{getAuthorInitials()}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link 
              href={`/app/team/${comment.createdById}`}
              className="font-medium text-sm hover:underline"
              data-testid={`link-author-${comment.id}`}
            >
              {getAuthorName()}
            </Link>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {isEdited && (
              <span className="text-xs text-muted-foreground italic">(edited)</span>
            )}
          </div>
          
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="min-h-[60px] resize-none"
                autoFocus
                data-testid="input-edit-comment"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  disabled={updateMutation.isPending}
                  data-testid="button-cancel-edit"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={!editBody.trim() || updateMutation.isPending}
                  data-testid="button-save-edit"
                >
                  <Check className="h-3 w-3 mr-1" />
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm whitespace-pre-wrap break-words" data-testid={`text-comment-body-${comment.id}`}>
              {comment.body}
            </p>
          )}

          {!isEditing && (
            <div className="flex items-center gap-1 mt-2">
              {canReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setIsReplying(!isReplying)}
                  data-testid={`button-reply-${comment.id}`}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              )}
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setIsEditing(true)}
                  data-testid={`button-edit-${comment.id}`}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-${comment.id}`}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {isReplying && (
        <div className="pl-11 mt-2">
          <CommentForm
            entityType={entityType}
            entityId={entityId}
            parentId={comment.id}
            onCancel={() => setIsReplying(false)}
            onSuccess={() => setIsReplying(false)}
            placeholder="Write a reply..."
            autoFocus
          />
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3 mt-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              entityType={entityType}
              entityId={entityId}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentListProps {
  entityType: string;
  entityId: string;
  currentUser?: User;
}

export function CommentList({ entityType, entityId, currentUser }: CommentListProps) {
  const { data: comments, isLoading, error } = useQuery<CommentWithAuthor[]>({
    queryKey: ["/api/comments", entityType, entityId],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load comments. Please try again.
      </div>
    );
  }

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="space-y-6" data-testid="comment-list">
      <CommentForm entityType={entityType} entityId={entityId} />
      
      {!comments || comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
          <MessageSquare className="h-8 w-8" />
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUser?.id}
              isAdmin={isAdmin}
              entityType={entityType}
              entityId={entityId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
