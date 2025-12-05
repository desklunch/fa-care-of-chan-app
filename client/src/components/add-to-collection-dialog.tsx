import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { VenueCollectionWithCreator } from "@shared/schema";
import { FolderPlus, Plus, Loader2 } from "lucide-react";

interface AddToCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueIds: string[];
  onSuccess?: () => void;
}

export function AddToCollectionDialog({
  open,
  onOpenChange,
  venueIds,
  onSuccess,
}: AddToCollectionDialogProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");

  const { data: collections = [], isLoading: isCollectionsLoading } = useQuery<VenueCollectionWithCreator[]>({
    queryKey: ["/api/venue-collections"],
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setMode(collections.length > 0 ? "existing" : "new");
      setSelectedCollectionId("");
      setNewCollectionName("");
      setNewCollectionDescription("");
    }
  }, [open, collections.length]);

  const createAndAddMutation = useMutation({
    mutationFn: async () => {
      const createResponse = await apiRequest("POST", "/api/venue-collections", {
        name: newCollectionName,
        description: newCollectionDescription || null,
      });
      const newCollection = await createResponse.json();
      
      await apiRequest("POST", `/api/venue-collections/${newCollection.id}/venues`, {
        venueIds,
      });
      
      return newCollection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venue-collections"] });
      venueIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: ["/api/venues", id, "collections"] });
      });
      toast({ 
        title: "Collection created!", 
        description: `Added ${venueIds.length} venue${venueIds.length !== 1 ? "s" : ""} to the new collection.` 
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create collection", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const addToExistingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/venue-collections/${selectedCollectionId}/venues`, {
        venueIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venue-collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/venue-collections", selectedCollectionId] });
      venueIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: ["/api/venues", id, "collections"] });
      });
      const selectedCollection = collections.find(c => c.id === selectedCollectionId);
      toast({ 
        title: "Added to collection!", 
        description: `Added ${venueIds.length} venue${venueIds.length !== 1 ? "s" : ""} to "${selectedCollection?.name}".` 
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to add to collection", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = () => {
    if (mode === "new") {
      if (!newCollectionName.trim()) {
        toast({ 
          title: "Name required", 
          description: "Please enter a name for the new collection.",
          variant: "destructive" 
        });
        return;
      }
      createAndAddMutation.mutate();
    } else {
      if (!selectedCollectionId) {
        toast({ 
          title: "Collection required", 
          description: "Please select a collection.",
          variant: "destructive" 
        });
        return;
      }
      addToExistingMutation.mutate();
    }
  };

  const isPending = createAndAddMutation.isPending || addToExistingMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Add to Collection
          </DialogTitle>
          <DialogDescription>
            Add {venueIds.length} venue{venueIds.length !== 1 ? "s" : ""} to a collection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isCollectionsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              {collections.length > 0 && (
                <div className="flex gap-2 border-b pb-4">
                  <Button
                    type="button"
                    variant={mode === "existing" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode("existing")}
                    data-testid="button-mode-existing"
                  >
                    Existing Collection
                  </Button>
                  <Button
                    type="button"
                    variant={mode === "new" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode("new")}
                    data-testid="button-mode-new"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New Collection
                  </Button>
                </div>
              )}

              {mode === "existing" && collections.length > 0 ? (
                <div className="space-y-3">
                  <Label>Select a collection</Label>
                  <RadioGroup
                    value={selectedCollectionId}
                    onValueChange={setSelectedCollectionId}
                    className="space-y-2"
                  >
                    {collections.map((collection) => (
                      <div
                        key={collection.id}
                        className="flex items-center space-x-3 rounded-lg border p-3 hover-elevate cursor-pointer"
                        onClick={() => setSelectedCollectionId(collection.id)}
                        data-testid={`radio-collection-${collection.id}`}
                      >
                        <RadioGroupItem value={collection.id} id={collection.id} />
                        <div className="flex-1 min-w-0">
                          <label 
                            htmlFor={collection.id} 
                            className="font-medium cursor-pointer block truncate"
                          >
                            {collection.name}
                          </label>
                          <span className="text-xs text-muted-foreground">
                            {collection.venueCount} venue{collection.venueCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="collection-name">Collection Name</Label>
                    <Input
                      id="collection-name"
                      placeholder="e.g., Wedding Venues, Corporate Events"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      data-testid="input-new-collection-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="collection-description">Description (optional)</Label>
                    <Textarea
                      id="collection-description"
                      placeholder="A brief description of this collection..."
                      value={newCollectionDescription}
                      onChange={(e) => setNewCollectionDescription(e.target.value)}
                      className="resize-none"
                      rows={3}
                      data-testid="input-new-collection-description"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || isCollectionsLoading}
            data-testid="button-add-to-collection"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : mode === "new" ? (
              "Create & Add"
            ) : (
              "Add to Collection"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
