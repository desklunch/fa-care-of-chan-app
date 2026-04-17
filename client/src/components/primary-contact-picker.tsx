import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Contact } from "@shared/schema";

export interface PrimaryContactPickerProps {
  clientId: string | null | undefined;
  value: string;
  onChange: (contactId: string) => void;
  onContactCreated?: (contactId: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  testId?: string;
}

export function PrimaryContactPicker({
  clientId,
  value,
  onChange,
  onContactCreated,
  disabled,
  autoFocus,
  className,
  testId = "select-primary-contact",
}: PrimaryContactPickerProps) {
  const { toast } = useToast();

  const { data: linkedContacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/clients", clientId, "contacts"],
    enabled: Boolean(clientId),
  });

  const [createContactOpen, setCreateContactOpen] = useState(false);
  const [newContactFirstName, setNewContactFirstName] = useState("");
  const [newContactLastName, setNewContactLastName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactErrors, setNewContactErrors] = useState<
    Record<string, string>
  >({});

  const resetDialog = () => {
    setNewContactErrors({});
    setNewContactFirstName("");
    setNewContactLastName("");
    setNewContactEmail("");
  };

  const createContactMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) {
        throw new Error("No client selected");
      }
      const errors: Record<string, string> = {};
      if (!newContactFirstName.trim())
        errors.firstName = "First name is required";
      if (!newContactLastName.trim())
        errors.lastName = "Last name is required";
      if (!newContactEmail.trim()) errors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newContactEmail.trim()))
        errors.email = "Invalid email address";
      if (Object.keys(errors).length > 0) {
        setNewContactErrors(errors);
        throw new Error("Validation failed");
      }

      const contactRes = await apiRequest("POST", "/api/contacts", {
        firstName: newContactFirstName.trim(),
        lastName: newContactLastName.trim(),
        emailAddresses: [newContactEmail.trim()],
      });
      const contact = await contactRes.json();

      await apiRequest(
        "POST",
        `/api/contacts/${contact.id}/clients/${clientId}`,
      );

      return contact;
    },
    onSuccess: (contact) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/clients", clientId, "contacts"],
      });
      if (onContactCreated) {
        onContactCreated(contact.id);
      } else {
        onChange(contact.id);
      }
      setCreateContactOpen(false);
      resetDialog();
      toast({
        title: "Contact created",
        description: `${contact.firstName} ${contact.lastName} has been created and linked.`,
      });
    },
    onError: (error: Error) => {
      if (error.message !== "Validation failed") {
        toast({
          title: "Error",
          description:
            error.message === "No client selected"
              ? "Please select a client first."
              : "Failed to create contact. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  return (
    <>
      <Select
        onValueChange={(val) => {
          if (val === "__create_new__") {
            setCreateContactOpen(true);
            return;
          }
          onChange(val === "__none__" ? "" : val);
        }}
        value={value || "__none__"}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            !value || value === "__none__" ? "text-muted-foreground" : "",
            className,
          )}
          autoFocus={autoFocus}
          data-testid={testId}
        >
          <SelectValue placeholder="Select primary contact..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">
            {linkedContacts.length === 0 ? (
              <span className="text-xs">No contacts found for this client</span>
            ) : (
              "None"
            )}
          </SelectItem>
          {linkedContacts.map((contact) => (
            <SelectItem
              key={contact.id}
              value={contact.id}
              data-testid={`select-contact-${contact.id}`}
            >
              {contact.firstName} {contact.lastName}
            </SelectItem>
          ))}
          <SelectItem
            value="__create_new__"
            data-testid="select-create-new-contact"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-3.5 w-3.5" />
              Create New Contact
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog
        open={createContactOpen}
        onOpenChange={(open) => {
          setCreateContactOpen(open);
          if (!open) {
            resetDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Contact</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-contact-first-name">First Name</Label>
              <Input
                id="new-contact-first-name"
                data-testid="input-new-contact-first-name"
                value={newContactFirstName}
                onChange={(e) => {
                  setNewContactFirstName(e.target.value);
                  setNewContactErrors((prev) => {
                    const { firstName, ...rest } = prev;
                    return rest;
                  });
                }}
                placeholder="First name"
              />
              {newContactErrors.firstName && (
                <p className="text-sm text-destructive">
                  {newContactErrors.firstName}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-contact-last-name">Last Name</Label>
              <Input
                id="new-contact-last-name"
                data-testid="input-new-contact-last-name"
                value={newContactLastName}
                onChange={(e) => {
                  setNewContactLastName(e.target.value);
                  setNewContactErrors((prev) => {
                    const { lastName, ...rest } = prev;
                    return rest;
                  });
                }}
                placeholder="Last name"
              />
              {newContactErrors.lastName && (
                <p className="text-sm text-destructive">
                  {newContactErrors.lastName}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-contact-email">Email</Label>
              <Input
                id="new-contact-email"
                data-testid="input-new-contact-email"
                type="email"
                value={newContactEmail}
                onChange={(e) => {
                  setNewContactEmail(e.target.value);
                  setNewContactErrors((prev) => {
                    const { email, ...rest } = prev;
                    return rest;
                  });
                }}
                placeholder="Email address"
              />
              {newContactErrors.email && (
                <p className="text-sm text-destructive">
                  {newContactErrors.email}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateContactOpen(false)}
              data-testid="button-cancel-create-contact"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createContactMutation.mutate()}
              disabled={createContactMutation.isPending}
              data-testid="button-submit-create-contact"
            >
              {createContactMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
