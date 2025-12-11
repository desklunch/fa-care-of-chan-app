import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Tag } from "@shared/schema";

interface TagAssignmentProps {
  category: "Cuisine" | "Style";
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  disabled?: boolean;
}

export function TagAssignment({
  category,
  selectedTagIds,
  onTagsChange,
  disabled = false,
}: TagAssignmentProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery<Tag[]>({
    queryKey: ["/api/tags/category", category],
  });

  const createTagMutation = useMutation({
    mutationFn: async (name: string): Promise<Tag> => {
      const response = await apiRequest("POST", "/api/tags", { name, category });
      return response.json();
    },
    onSuccess: (newTag: Tag) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags/category", category] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      onTagsChange([...selectedTagIds, newTag.id]);
      setSearchValue("");
      setIsCreating(false);
    },
    onError: () => {
      setIsCreating(false);
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));
  const filteredTags = tags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(searchValue.toLowerCase()) &&
      !selectedTagIds.includes(tag.id)
  );

  const showCreateOption =
    searchValue.length > 0 &&
    !tags.some(
      (tag) => tag.name.toLowerCase() === searchValue.toLowerCase()
    );

  const handleSelect = (tagId: string) => {
    onTagsChange([...selectedTagIds, tagId]);
    setSearchValue("");
    inputRef.current?.focus();
  };

  const handleRemove = (tagId: string) => {
    onTagsChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const handleCreate = () => {
    if (searchValue.trim() && !isCreating) {
      setIsCreating(true);
      createTagMutation.mutate(searchValue.trim());
    }
  };

  const showSuggestions = isFocused && (filteredTags.length > 0 || showCreateOption || searchValue.length > 0);

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="relative">
        <Input
          ref={inputRef}
          placeholder={`Search or create ${category.toLowerCase()} tag...`}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          disabled={disabled || isLoading}
          className="h-12 pb-3"
          data-testid={`input-search-${category.toLowerCase()}-tag`}
        />
        
        {showSuggestions && (
          <div className="absolute z-50 bottom-full mb-1 w-full rounded-md border bg-popover shadow-md">
            <ScrollArea className="max-h-[200px]">
              <div className="p-1">
                {filteredTags.length === 0 && !showCreateOption && (
                  <div className="py-3 text-center text-sm text-muted-foreground">
                    {searchValue ? "No matching tags found" : "No more tags available"}
                  </div>
                )}
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover-elevate",
                      "hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => handleSelect(tag.id)}
                    data-testid={`option-tag-${tag.id}`}
                  >
                    <Check className="mr-2 h-4 w-4 opacity-0" />
                    {tag.name}
                  </button>
                ))}
                {showCreateOption && (
                  <button
                    type="button"
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                      "hover:bg-accent hover:text-accent-foreground",
                      "text-primary font-medium"
                    )}
                    onClick={handleCreate}
                    disabled={isCreating}
                    data-testid={`button-create-${category.toLowerCase()}-tag`}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {isCreating ? "Creating..." : `Create "${searchValue}"`}
                  </button>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {selectedTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="gap-1 pr-1"
            data-testid={`badge-tag-${tag.id}`}
          >
            {tag.name}
            <button
              type="button"
              onClick={() => handleRemove(tag.id)}
              disabled={disabled}
              className="ml-0.5 rounded-sm hover:bg-muted p-0.5"
              data-testid={`button-remove-tag-${tag.id}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
