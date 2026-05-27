import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Contact, ContactLocation } from "@shared/schema";
import { PlaceAutocomplete } from "@/components/ui/place-autocomplete";
import { resolveContactLocationTimezone } from "@/lib/contact-location";

export interface CreateContactDialogClientOption {
  id: string;
  name: string;
}

export interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string | null;
  clientOptions?: CreateContactDialogClientOption[];
  defaultClientId?: string | null;
  onCreated?: (contact: Contact, clientId: string) => void;
  testIdPrefix?: string;
}

export function CreateContactDialog({
  open,
  onOpenChange,
  clientId,
  clientOptions,
  defaultClientId,
  onCreated,
  testIdPrefix = "",
}: CreateContactDialogProps) {
  const { toast } = useToast();

  const hasOptions = Array.isArray(clientOptions) && clientOptions.length > 0;
  const showClientSelector = hasOptions && clientOptions!.length > 1;

  const initialClientId = (() => {
    if (clientId) return clientId;
    if (defaultClientId) return defaultClientId;
    if (hasOptions) return clientOptions![0].id;
    return "";
  })();

  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState<ContactLocation | null>(null);
  const [resolvingTimezone, setResolvingTimezone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setSelectedClientId(initialClientId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clientId, defaultClientId]);

  const resetState = () => {
    setErrors({});
    setFirstName("");
    setLastName("");
    setEmail("");
    setJobTitle("");
    setLocation(null);
  };

  const prefix = testIdPrefix ? `${testIdPrefix}-` : "";

  const createContactMutation = useMutation({
    mutationFn: async () => {
      const targetClientId = clientId || selectedClientId;
      if (!targetClientId) {
        throw new Error("No client selected");
      }
      const validationErrors: Record<string, string> = {};
      if (!firstName.trim()) validationErrors.firstName = "First name is required";
      if (!lastName.trim()) validationErrors.lastName = "Last name is required";
      if (!email.trim()) validationErrors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        validationErrors.email = "Invalid email address";
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        throw new Error("Validation failed");
      }

      const contactRes = await apiRequest("POST", "/api/contacts", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddresses: [email.trim()],
        jobTitle: jobTitle.trim() || null,
        location,
      });
      const contact: Contact = await contactRes.json();

      await apiRequest(
        "POST",
        `/api/contacts/${contact.id}/clients/${targetClientId}`,
      );

      return { contact, targetClientId };
    },
    onSuccess: ({ contact, targetClientId }) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/clients", targetClientId, "contacts"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      onCreated?.(contact, targetClientId);
      onOpenChange(false);
      resetState();
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetState();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Contact</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          {showClientSelector && !clientId && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${prefix}new-contact-client`}>Link to Client</Label>
              <Select
                value={selectedClientId}
                onValueChange={setSelectedClientId}
              >
                <SelectTrigger
                  id={`${prefix}new-contact-client`}
                  data-testid={`${prefix}select-new-contact-client`}
                >
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clientOptions!.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      data-testid={`${prefix}option-new-contact-client-${c.id}`}
                    >
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${prefix}new-contact-first-name`}>First Name</Label>
            <Input
              id={`${prefix}new-contact-first-name`}
              data-testid={`${prefix}input-new-contact-first-name`}
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                setErrors((prev) => {
                  const { firstName: _omit, ...rest } = prev;
                  return rest;
                });
              }}
              placeholder="First name"
            />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${prefix}new-contact-last-name`}>Last Name</Label>
            <Input
              id={`${prefix}new-contact-last-name`}
              data-testid={`${prefix}input-new-contact-last-name`}
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                setErrors((prev) => {
                  const { lastName: _omit, ...rest } = prev;
                  return rest;
                });
              }}
              placeholder="Last name"
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${prefix}new-contact-email`}>Email</Label>
            <Input
              id={`${prefix}new-contact-email`}
              data-testid={`${prefix}input-new-contact-email`}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev) => {
                  const { email: _omit, ...rest } = prev;
                  return rest;
                });
              }}
              placeholder="Email address"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${prefix}new-contact-job-title`}>Job Title</Label>
            <Input
              id={`${prefix}new-contact-job-title`}
              data-testid={`${prefix}input-new-contact-job-title`}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Job title (optional)"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Location</Label>
            <PlaceAutocomplete
              value={null}
              onSelect={async (place) => {
                if (!place) {
                  setLocation(null);
                  return;
                }
                setResolvingTimezone(true);
                try {
                  const enriched = await resolveContactLocationTimezone(place);
                  setLocation(enriched);
                } finally {
                  setResolvingTimezone(false);
                }
              }}
              placeholder="Search for a city (optional)..."
              data-testid={`${prefix}input-new-contact-location`}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid={`${prefix}button-cancel-create-contact`}
          >
            Cancel
          </Button>
          <Button
            onClick={() => createContactMutation.mutate()}
            disabled={createContactMutation.isPending || resolvingTimezone}
            data-testid={`${prefix}button-submit-create-contact`}
          >
            {createContactMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
