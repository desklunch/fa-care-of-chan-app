import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Contact } from "@shared/schema";
import { CreateContactDialog } from "@/components/create-contact-dialog";

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
  const { data: linkedContacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/clients", clientId, "contacts"],
    enabled: Boolean(clientId),
  });

  const [createContactOpen, setCreateContactOpen] = useState(false);

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

      <CreateContactDialog
        open={createContactOpen}
        onOpenChange={setCreateContactOpen}
        clientId={clientId ?? null}
        onCreated={(contact) => {
          if (onContactCreated) {
            onContactCreated(contact.id);
          } else {
            onChange(contact.id);
          }
        }}
      />
    </>
  );
}
