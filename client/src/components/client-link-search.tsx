import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@shared/schema";
import { X, Search, Building2, Loader2 } from "lucide-react";

interface ClientLinkSearchProps {
  contactId: string;
  linkedClients: Client[];
  onLink: (client: Client) => void;
  onUnlink: (clientId: string) => void;
  disabled?: boolean;
  showLinkedClients?: boolean;
  autoFocus?: boolean;
  onClose?: () => void;
}

export function ClientLinkSearch({
  contactId,
  linkedClients,
  onLink,
  onUnlink,
  disabled = false,
  showLinkedClients = true,
  autoFocus = false,
  onClose,
}: ClientLinkSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: allClients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const linkedClientIds = new Set(linkedClients.map(c => c.id));
  
  const filteredClients = allClients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase());
    const notAlreadyLinked = !linkedClientIds.has(client.id);
    return matchesSearch && notAlreadyLinked;
  });

  const linkMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await apiRequest("POST", `/api/contacts/${contactId}/clients/${clientId}`);
      return clientId;
    },
    onSuccess: (clientId) => {
      const client = allClients.find(c => c.id === clientId);
      if (client) {
        onLink(client);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "clients"] });
      setSearchQuery("");
      toast({
        title: "Client linked",
        description: "Client has been linked to this contact.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to link client",
        variant: "destructive",
      });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await apiRequest("DELETE", `/api/contacts/${contactId}/clients/${clientId}`);
      return clientId;
    },
    onSuccess: (clientId) => {
      onUnlink(clientId);
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "clients"] });
      toast({
        title: "Client unlinked",
        description: "Client has been removed from this contact.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unlink client",
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

  const handleSelectClient = (client: Client) => {
    linkMutation.mutate(client.id);
  };

  const showSuggestions = searchQuery.length > 0;

  return (
    <div className="space-y-3">
      {showLinkedClients && linkedClients.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {linkedClients.map((client) => (
            <Badge
              key={client.id}
              variant="secondary"
              className="flex items-center gap-1 py-1 px-2"
              data-testid={`badge-linked-client-${client.id}`}
            >
              <Building2 className="h-3 w-3" />
              <span>{client.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => unlinkMutation.mutate(client.id)}
                  className="ml-1 hover-elevate rounded-full p-0.5"
                  disabled={unlinkMutation.isPending}
                  data-testid={`button-unlink-client-${client.id}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {!disabled && (
        <div className="relative" ref={containerRef}>
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search clients to link..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
                data-testid="input-client-link-search"
              />
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                data-testid="button-close-client-search"
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
              ) : filteredClients.length > 0 ? (
                <ul className="py-1">
                  {filteredClients.slice(0, 10).map((client) => (
                    <li key={client.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover-elevate flex items-center gap-2"
                        onClick={() => handleSelectClient(client)}
                        data-testid={`option-client-${client.id}`}
                      >
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{client.name}</span>
                        {client.industry && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {client.industry}
                          </Badge>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-3 text-sm text-muted-foreground">
                  No clients found matching "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
