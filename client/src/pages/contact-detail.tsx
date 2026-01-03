import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar as CalendarIcon,
  Loader2,
  Pencil,
  UserPlus,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { SiInstagram, SiLinkedin } from "react-icons/si";
import type { Contact, Client } from "@shared/schema";
import { format } from "date-fns";
import { usePageTitle } from "@/hooks/use-page-title";
import { ClientLinkSearch } from "@/components/client-link-search";
import { parseDateOnly } from "@/lib/date";
import { cn } from "@/lib/utils";

type EditableFieldType = "text" | "textarea" | "date" | "array";

interface EditableFieldRowProps {
  label: string;
  value: string | null | undefined;
  field: string;
  testId?: string;
  type?: EditableFieldType;
  onSave: (field: string, value: unknown) => void;
  displayValue?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  arrayValue?: string[];
}

function EditableFieldRow({
  label,
  value,
  field,
  testId,
  type = "text",
  onSave,
  displayValue,
  placeholder = "Not set",
  disabled = false,
  arrayValue = [],
}: EditableFieldRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [editArray, setEditArray] = useState<string[]>(arrayValue);
  const [dateOpen, setDateOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value || "");
    setEditArray(arrayValue);
  }, [value, arrayValue]);

  const handleSave = () => {
    if (type === "array") {
      const cleanedArray = editArray.filter(v => v.trim() !== "");
      onSave(field, cleanedArray);
    } else if (type === "date") {
      onSave(field, editValue || null);
    } else {
      onSave(field, editValue || null);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || "");
    setEditArray(arrayValue);
    setIsEditing(false);
    setDateOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && type !== "textarea" && type !== "array") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleDoubleClick = () => {
    if (!disabled) {
      setIsEditing(true);
    }
  };

  const renderEditor = () => {
    switch (type) {
      case "textarea":
        return (
          <div className="flex flex-col gap-2 w-full">
            <Textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancel();
              }}
              className="min-h-[100px] text-base"
              data-testid={`input-${field}`}
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={handleCancel} data-testid={`button-cancel-${field}`}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave} data-testid={`button-save-${field}`}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case "date":
        const parsedDate = editValue ? parseDateOnly(editValue) : null;
        return (
          <div className="flex flex-col gap-2 w-full">
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !editValue && "text-muted-foreground"
                  )}
                  data-testid={`datepicker-${field}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {parsedDate ? format(parsedDate, "PPP") : placeholder}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parsedDate || undefined}
                  onSelect={(date) => {
                    if (date) {
                      const formatted = format(date, "yyyy-MM-dd");
                      setEditValue(formatted);
                    } else {
                      setEditValue("");
                    }
                    setDateOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={handleCancel} data-testid={`button-cancel-${field}`}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => { onSave(field, editValue || null); setIsEditing(false); }} data-testid={`button-save-${field}`}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case "array":
        return (
          <div className="flex flex-col gap-2 w-full">
            {editArray.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) => {
                    const newArray = [...editArray];
                    newArray[index] = e.target.value;
                    setEditArray(newArray);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") handleCancel();
                  }}
                  className="flex-1"
                  data-testid={`input-${field}-${index}`}
                  autoFocus={index === 0}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditArray(editArray.filter((_, i) => i !== index));
                  }}
                  data-testid={`button-remove-${field}-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditArray([...editArray, ""])}
              data-testid={`button-add-${field}`}
            >
              Add
            </Button>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={handleCancel} data-testid={`button-cancel-${field}`}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave} data-testid={`button-save-${field}`}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col gap-2 w-full">
            <Input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full text-sm"
              data-testid={`input-${field}`}
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={handleCancel} data-testid={`button-cancel-${field}`}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave} data-testid={`button-save-${field}`}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className="group flex py-4 border-b border-border/50 last:border-b-0"
      data-testid={testId}
      onDoubleClick={handleDoubleClick}
    >
      <div className="w-2/5 text-sm font-semibold shrink-0">{label}</div>
      <div className="flex-1 text-sm">
        {isEditing ? (
          renderEditor()
        ) : (
          <div className="flex items-start gap-2 group">
            <div className="flex-1">
              {displayValue !== undefined ? displayValue : (
                value ? (
                  <span className="whitespace-pre-wrap">{value}</span>
                ) : (
                  <span className="text-muted-foreground">{placeholder}</span>
                )
              )}
            </div>
            {!disabled && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={() => setIsEditing(true)}
                data-testid={`button-edit-${field}`}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FieldRow({
  label,
  children,
  testId,
}: {
  label: string;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <div
      className="flex py-4 border-b border-border/50 last:border-b-0"
      data-testid={testId}
    >
      <div className="w-2/5 text-sm font-semibold shrink-0">{label}</div>
      <div className="flex-1 text-sm">{children}</div>
    </div>
  );
}

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [showClientSearch, setShowClientSearch] = useState(false);
  const { toast } = useToast();

  const {
    data: contact,
    isLoading,
    error,
  } = useQuery<Contact>({
    queryKey: ["/api/contacts", id],
    enabled: !!id,
  });

  const { data: linkedClients = [] } = useQuery<Client[]>({
    queryKey: ["/api/contacts", id, "clients"],
    enabled: !!id,
  });

  const [localLinkedClients, setLocalLinkedClients] = useState<Client[]>([]);

  useEffect(() => {
    setLocalLinkedClients(linkedClients);
  }, [linkedClients]);

  const updateContactMutation = useMutation({
    mutationFn: async (data: Partial<Contact>) => {
      const response = await apiRequest("PATCH", `/api/contacts/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", id] });
      toast({ title: "Contact updated" });
    },
    onError: () => {
      toast({ title: "Failed to update contact", variant: "destructive" });
    },
  });

  const unlinkClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await apiRequest("DELETE", `/api/contacts/${id}/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", id, "clients"] });
    },
  });

  const handleFieldSave = (field: string, value: unknown) => {
    updateContactMutation.mutate({ [field]: value });
  };

  const handleLinkClient = (client: Client) => {
    setLocalLinkedClients((prev) => [...prev, client]);
    setShowClientSearch(false);
  };

  const handleUnlinkClient = (clientId: string) => {
    setLocalLinkedClients((prev) => prev.filter((c) => c.id !== clientId));
    unlinkClientMutation.mutate(clientId);
  };

  usePageTitle(
    contact ? `${contact.firstName} ${contact.lastName}` : "Contact",
  );

  if (isLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Contacts", href: "/contacts" },
          { label: "Loading..." },
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (error || !contact) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Contacts", href: "/contacts" },
          { label: "Not Found" },
        ]}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Contact not found</p>
          <Button variant="outline" onClick={() => setLocation("/contacts")}>
            Back to Contacts
          </Button>
        </div>
      </PageLayout>
    );
  }

  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Contacts", href: "/contacts" },
        { label: fullName },
      ]}
    >
      <div className="max-w-4xl space-y-6 p-4 md:p-6">
        <h1 className="text-3xl font-bold" data-testid="text-contact-name">
          {fullName}
        </h1>

        <Card>
          <CardContent className="pt-6">
            {localLinkedClients.length > 0 ? (
              localLinkedClients.map((client, index) => (
                <FieldRow
                  key={client.id}
                  label={index === 0 ? "Company" : ""}
                  testId={`field-linked-client-${client.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/clients/${client.id}`}
                      className="text-primary hover:underline"
                      data-testid={`link-client-${client.id}`}
                    >
                      {client.name}
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlinkClient(client.id)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      data-testid={`button-unlink-client-${client.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </FieldRow>
              ))
            ) : !showClientSearch ? (
              <FieldRow label="Company" testId="field-linked-client-empty">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowClientSearch(true)}
                  className="h-auto p-0 text-muted-foreground hover:text-primary"
                  data-testid="button-link-client-inline"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Company
                </Button>
              </FieldRow>
            ) : null}

            {showClientSearch && (
              <FieldRow
                label={localLinkedClients.length === 0 ? "Company" : ""}
                testId="field-client-search"
              >
                <ClientLinkSearch
                  contactId={id!}
                  linkedClients={localLinkedClients}
                  onLink={handleLinkClient}
                  onUnlink={handleUnlinkClient}
                  showLinkedClients={false}
                  autoFocus
                  onClose={() => setShowClientSearch(false)}
                />
              </FieldRow>
            )}

            <EditableFieldRow
              label="Job Title"
              value={contact.jobTitle}
              field="jobTitle"
              testId="field-contact-job-title"
              onSave={handleFieldSave}
            />

            <EditableFieldRow
              label="Email"
              value={null}
              field="emailAddresses"
              testId="field-contact-email"
              type="array"
              arrayValue={contact.emailAddresses || []}
              onSave={handleFieldSave}
              displayValue={
                contact.emailAddresses && contact.emailAddresses.length > 0 ? (
                  <div className="space-y-1">
                    {contact.emailAddresses.map((email, index) => (
                      <a
                        key={index}
                        href={`mailto:${email}`}
                        className="flex items-center gap-2 text-primary hover:underline"
                        data-testid={`link-email-${index}`}
                      >
                        <span>{email}</span>
                      </a>
                    ))}
                  </div>
                ) : undefined
              }
            />

            <EditableFieldRow
              label="Phone"
              value={null}
              field="phoneNumbers"
              testId="field-contact-phone"
              type="array"
              arrayValue={contact.phoneNumbers || []}
              onSave={handleFieldSave}
              displayValue={
                contact.phoneNumbers && contact.phoneNumbers.length > 0 ? (
                  <div className="space-y-1">
                    {contact.phoneNumbers.map((phone, index) => (
                      <a
                        key={index}
                        href={`tel:${phone}`}
                        className="flex items-center gap-2 text-primary hover:underline"
                        data-testid={`link-phone-${index}`}
                      >
                        <span>{phone}</span>
                      </a>
                    ))}
                  </div>
                ) : undefined
              }
            />

            <EditableFieldRow
              label="Instagram"
              value={contact.instagramUsername}
              field="instagramUsername"
              testId="field-contact-instagram"
              onSave={handleFieldSave}
              displayValue={
                contact.instagramUsername ? (
                  <a
                    href={`https://instagram.com/${contact.instagramUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                    data-testid="link-instagram"
                  >
                    <SiInstagram className="h-4 w-4 text-muted-foreground" />
                    <span>@{contact.instagramUsername}</span>
                  </a>
                ) : undefined
              }
            />

            <EditableFieldRow
              label="LinkedIn"
              value={contact.linkedinUsername}
              field="linkedinUsername"
              testId="field-contact-linkedin"
              onSave={handleFieldSave}
              displayValue={
                contact.linkedinUsername ? (
                  <a
                    href={`https://linkedin.com/in/${contact.linkedinUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                    data-testid="link-linkedin"
                  >
                    <SiLinkedin className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.linkedinUsername}</span>
                  </a>
                ) : undefined
              }
            />

            <EditableFieldRow
              label="Address"
              value={contact.homeAddress}
              field="homeAddress"
              testId="field-contact-address"
              type="textarea"
              onSave={handleFieldSave}
            />

            <EditableFieldRow
              label="Date of Birth"
              value={contact.dateOfBirth ? format(new Date(contact.dateOfBirth), "yyyy-MM-dd") : null}
              field="dateOfBirth"
              testId="field-contact-dob"
              type="date"
              onSave={handleFieldSave}
              displayValue={
                contact.dateOfBirth ? (
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(contact.dateOfBirth), "MMMM d, yyyy")}
                    </span>
                  </div>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
