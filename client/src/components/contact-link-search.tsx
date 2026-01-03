import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Contact } from "@shared/schema";
import { X, Search, User, Loader2 } from "lucide-react";

interface ContactLinkSearchProps {
  clientId: string;
  linkedContacts: Contact[];
  onLink: (contact: Contact) => void;
  onUnlink: (contactId: string) => void;
  disabled?: boolean;
  showLinkedContacts?: boolean;
  autoFocus?: boolean;
  onClose?: () => void;
}

export function ContactLinkSearch({
  clientId,
  linkedContacts,
  onLink,
  onUnlink,
  disabled = false,
  showLinkedContacts = true,
  autoFocus = false,
  onClose,
}: ContactLinkSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: allContacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const linkedContactIds = new Set(linkedContacts.map(c => c.id));
  
  const filteredContacts = allContacts.filter((contact) => {
    const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());
    const notAlreadyLinked = !linkedContactIds.has(contact.id);
    return matchesSearch && notAlreadyLinked;
  });

  const linkMutation = useMutation({
    mutationFn: async (contactId: string) => {
      await apiRequest("POST", `/api/clients/${clientId}/contacts/${contactId}`);
      return contactId;
    },
    onSuccess: (contactId) => {
      const contact = allContacts.find(c => c.id === contactId);
      if (contact) {
        onLink(contact);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
      setSearchQuery("");
      toast({
        title: "Contact linked",
        description: "Contact has been linked to this client.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to link contact",
        variant: "destructive",
      });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async (contactId: string) => {
      await apiRequest("DELETE", `/api/clients/${clientId}/contacts/${contactId}`);
      return contactId;
    },
    onSuccess: (contactId) => {
      onUnlink(contactId);
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
      toast({
        title: "Contact unlinked",
        description: "Contact has been removed from this client.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unlink contact",
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

  const handleSelectContact = (contact: Contact) => {
    linkMutation.mutate(contact.id);
  };

  const showSuggestions = searchQuery.length > 0;

  return (
    <div className="space-y-3">
      {showLinkedContacts && linkedContacts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {linkedContacts.map((contact) => (
            <Badge
              key={contact.id}
              variant="secondary"
              className="flex items-center gap-1 py-1 px-2"
              data-testid={`badge-linked-contact-${contact.id}`}
            >
              <User className="h-3 w-3" />
              <span>{contact.firstName} {contact.lastName}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => unlinkMutation.mutate(contact.id)}
                  className="ml-1 hover-elevate rounded-full p-0.5"
                  disabled={unlinkMutation.isPending}
                  data-testid={`button-unlink-contact-${contact.id}`}
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
                placeholder="Search contacts to link..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
                data-testid="input-contact-link-search"
              />
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                data-testid="button-close-contact-search"
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
              ) : filteredContacts.length > 0 ? (
                <ul className="py-1">
                  {filteredContacts.slice(0, 10).map((contact) => (
                    <li key={contact.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover-elevate flex items-center gap-2"
                        onClick={() => handleSelectContact(contact)}
                        data-testid={`option-contact-${contact.id}`}
                      >
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{contact.firstName} {contact.lastName}</span>
                        {contact.jobTitle && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {contact.jobTitle}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-3 text-sm text-muted-foreground">
                  No contacts found matching "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
