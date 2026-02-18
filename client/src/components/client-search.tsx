import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@shared/schema";
import { X, Search, Plus, Building2, Loader2 } from "lucide-react";

interface ClientSearchProps {
  selectedClientId?: string | null;
  selectedClientName?: string | null;
  onSelect: (client: { id: string; name: string } | null) => void;
  disabled?: boolean;
}

export function ClientSearch({
  selectedClientId,
  selectedClientName,
  onSelect,
  disabled = false,
}: ClientSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const createClientMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/clients", { name });
      return res.json() as Promise<Client>;
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      onSelect({ id: newClient.id, name: newClient.name });
      setShowCreateForm(false);
      setNewClientName("");
      setShowDropdown(false);
      toast({
        title: "Client created",
        description: `${newClient.name} has been added.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create client",
        variant: "destructive",
      });
    },
  });

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowCreateForm(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    onSelect(null);
    setSearchQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelectClient = (client: Client) => {
    onSelect({ id: client.id, name: client.name });
    setSearchQuery("");
    setShowDropdown(false);
  };

  const handleCreateClient = () => {
    if (newClientName.trim()) {
      createClientMutation.mutate(newClientName.trim());
    }
  };

  if (selectedClientId && selectedClientName) {
    return (
      <div className="bg-background flex items-center gap-2" ref={containerRef}>
        <div className="flex items-center justify-between gap-2 pl-3 pr-2 py-2 border border-input rounded-md flex-1">
          
          <span data-testid="text-selected-client" className="text-sm">{selectedClientName}</span>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClear}
              data-testid="button-clear-client"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
 
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search for a client..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          disabled={disabled}
          className="pl-9"
          data-testid="input-client-search"
        />
      </div>

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <>
              {filteredClients.length > 0 ? (
                <ul className="py-1">
                  {filteredClients.map((client) => (
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
              ) : searchQuery ? (
                <div className="p-3 text-sm text-muted-foreground">
                  No clients found matching "{searchQuery}"
                </div>
              ) : (
                <div className="p-3 text-sm text-muted-foreground">
                  Start typing to search clients
                </div>
              )}

              <div className="border-t p-2">
                {showCreateForm ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter new client name"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateClient();
                        }
                      }}
                      autoFocus
                      data-testid="input-new-client-name"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateClient}
                        disabled={!newClientName.trim() || createClientMutation.isPending}
                        data-testid="button-create-new-client"
                      >
                        {createClientMutation.isPending && (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        )}
                        Create
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowCreateForm(false);
                          setNewClientName("");
                        }}
                        data-testid="button-cancel-create-client"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setShowCreateForm(true);
                      setNewClientName(searchQuery);
                    }}
                    data-testid="button-add-new-client"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add new client
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
