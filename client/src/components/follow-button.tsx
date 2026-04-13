import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FollowButtonProps {
  entityType: string;
  entityId: string;
}

export function FollowButton({ entityType, entityId }: FollowButtonProps) {
  const { toast } = useToast();

  const { data: followStatus, isLoading } = useQuery<{ following: boolean }>({
    queryKey: ["/api/follows/status", entityType, entityId],
    queryFn: async () => {
      const res = await fetch(`/api/follows/status?entityType=${entityType}&entityId=${entityId}`);
      if (!res.ok) throw new Error("Failed to check follow status");
      return res.json();
    },
  });

  const followMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/follows", { entityType, entityId }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/follows/status", entityType, entityId] });
      const previous = queryClient.getQueryData(["/api/follows/status", entityType, entityId]);
      queryClient.setQueryData(["/api/follows/status", entityType, entityId], { following: true });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/follows/status", entityType, entityId], context.previous);
      }
      toast({ title: "Failed to follow", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follows/status", entityType, entityId] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/follows", { entityType, entityId }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/follows/status", entityType, entityId] });
      const previous = queryClient.getQueryData(["/api/follows/status", entityType, entityId]);
      queryClient.setQueryData(["/api/follows/status", entityType, entityId], { following: false });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/follows/status", entityType, entityId], context.previous);
      }
      toast({ title: "Failed to unfollow", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follows/status", entityType, entityId] });
    },
  });

  const isFollowing = followStatus?.following ?? false;
  const isPending = followMutation.isPending || unfollowMutation.isPending;

  function handleToggle() {
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  }

  if (isLoading) return null;

  return (
    <Button
      variant={isFollowing ? "secondary" : "outline"}
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
      data-testid={`button-follow-${entityType}-${entityId}`}
    >
      {isFollowing ? (
        <>
          <BellOff className="h-4 w-4 mr-1" />
          Unfollow
        </>
      ) : (
        <>
          <Bell className="h-4 w-4 mr-1" />
          Follow
        </>
      )}
    </Button>
  );
}
