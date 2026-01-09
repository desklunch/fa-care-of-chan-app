import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { X, Search, Loader2, type LucideIcon } from "lucide-react";

export interface LinkableEntity {
  id: string;
  displayName: string;
  badgeText?: string;
}

export interface EntityLinkConfig<T> {
  entityType: "client" | "vendor";
  queryKey: string[];
  searchPlaceholder: string;
  icon: LucideIcon;
  linkEndpoint: (contactId: string, entityId: string) => string;
  unlinkEndpoint: (contactId: string, entityId: string) => string;
  cacheInvalidationKey: (contactId: string) => string[];
  toastMessages: {
    linked: string;
    linkedDescription: string;
    unlinked: string;
    unlinkedDescription: string;
  };
  emptyStateText: (query: string) => string;
  mapToLinkable: (entity: T) => LinkableEntity;
  testIdPrefix: string;
}

interface EntityLinkSearchProps<T> {
  contactId: string;
  linkedEntities: T[];
  config: EntityLinkConfig<T>;
  onLink: (entity: T) => void;
  onUnlink: (entityId: string) => void;
  disabled?: boolean;
  showLinkedEntities?: boolean;
  autoFocus?: boolean;
  onClose?: () => void;
}

export function EntityLinkSearch<T extends { id: string }>({
  contactId,
  linkedEntities,
  config,
  onLink,
  onUnlink,
  disabled = false,
  showLinkedEntities = true,
  autoFocus = false,
  onClose,
}: EntityLinkSearchProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: allEntities = [], isLoading } = useQuery<T[]>({
    queryKey: config.queryKey,
  });

  const linkedEntityIds = new Set(linkedEntities.map((e) => e.id));

  const filteredEntities = allEntities.filter((entity) => {
    const linkable = config.mapToLinkable(entity);
    const matchesSearch = linkable.displayName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const notAlreadyLinked = !linkedEntityIds.has(entity.id);
    return matchesSearch && notAlreadyLinked;
  });

  const linkMutation = useMutation({
    mutationFn: async (entityId: string) => {
      await apiRequest("POST", config.linkEndpoint(contactId, entityId));
      return entityId;
    },
    onSuccess: (entityId) => {
      const entity = allEntities.find((e) => e.id === entityId);
      if (entity) {
        onLink(entity);
      }
      queryClient.invalidateQueries({
        queryKey: config.cacheInvalidationKey(contactId),
      });
      setSearchQuery("");
      toast({
        title: config.toastMessages.linked,
        description: config.toastMessages.linkedDescription,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || `Failed to link ${config.entityType}`,
        variant: "destructive",
      });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async (entityId: string) => {
      await apiRequest("DELETE", config.unlinkEndpoint(contactId, entityId));
      return entityId;
    },
    onSuccess: (entityId) => {
      onUnlink(entityId);
      queryClient.invalidateQueries({
        queryKey: config.cacheInvalidationKey(contactId),
      });
      toast({
        title: config.toastMessages.unlinked,
        description: config.toastMessages.unlinkedDescription,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || `Failed to unlink ${config.entityType}`,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && onClose) {
      onClose();
    }
  };

  const handleSelectEntity = (entity: T) => {
    linkMutation.mutate(entity.id);
  };

  const showSuggestions = searchQuery.length > 0;
  const IconComponent = config.icon;

  return (
    <div className="space-y-3">
      {showLinkedEntities && linkedEntities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {linkedEntities.map((entity) => {
            const linkable = config.mapToLinkable(entity);
            return (
              <Badge
                key={entity.id}
                variant="secondary"
                className="flex items-center gap-1 py-1 px-2"
                data-testid={`badge-linked-${config.testIdPrefix}-${entity.id}`}
              >
                <IconComponent className="h-3 w-3" />
                <span>{linkable.displayName}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => unlinkMutation.mutate(entity.id)}
                    className="ml-1 hover-elevate rounded-full p-0.5"
                    disabled={unlinkMutation.isPending}
                    data-testid={`button-unlink-${config.testIdPrefix}-${entity.id}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      )}

      {!disabled && (
        <div className="relative" ref={containerRef}>
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder={config.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
                data-testid={`input-${config.testIdPrefix}-link-search`}
              />
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                data-testid={`button-close-${config.testIdPrefix}-search`}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {showSuggestions && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
              {isLoading || linkMutation.isPending ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : filteredEntities.length > 0 ? (
                <ul className="py-1">
                  {filteredEntities.slice(0, 10).map((entity) => {
                    const linkable = config.mapToLinkable(entity);
                    return (
                      <li key={entity.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover-elevate flex items-center gap-2"
                          onClick={() => handleSelectEntity(entity)}
                          data-testid={`option-${config.testIdPrefix}-${entity.id}`}
                        >
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <span>{linkable.displayName}</span>
                          {linkable.badgeText && (
                            <Badge
                              variant="secondary"
                              className="ml-auto text-xs"
                            >
                              {linkable.badgeText}
                            </Badge>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="p-3 text-sm text-muted-foreground">
                  {config.emptyStateText(searchQuery)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
