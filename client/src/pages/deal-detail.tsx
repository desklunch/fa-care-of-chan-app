import { useState, useRef, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Loader2, Trash2, PenBox, Pencil, Check, X, CalendarIcon } from "lucide-react";
import { CommentList } from "@/components/ui/comments";
import { parseDateOnly } from "@/lib/date";
import { DealStatusBadge } from "@/components/deal-status-badge";
import { cn } from "@/lib/utils";
import type {
  DealWithRelations,
  DealStatus,
  DealService,
  User,
  Client,
} from "@shared/schema";
import { dealStatuses, dealServices } from "@shared/schema";

type EditableFieldType = "text" | "textarea" | "select" | "date" | "multiselect";

interface EditableFieldRowProps {
  label: string;
  value: string | null | undefined;
  field: string;
  testId?: string;
  type?: EditableFieldType;
  options?: { value: string; label: string }[];
  multiSelectValues?: string[];
  onSave: (field: string, value: unknown) => void;
  displayValue?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  valueClassName?: string;
}

function EditableFieldRow({
  label,
  value,
  field,
  testId,
  type = "text",
  options = [],
  multiSelectValues = [],
  onSave,
  displayValue,
  placeholder = "Not set",
  disabled = false,
  valueClassName,
}: EditableFieldRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [selectedMulti, setSelectedMulti] = useState<string[]>(multiSelectValues);
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
    setSelectedMulti(multiSelectValues);
  }, [value, multiSelectValues]);

  const handleSave = () => {
    if (type === "multiselect") {
      onSave(field, selectedMulti);
    } else if (type === "date") {
      onSave(field, editValue || null);
    } else {
      onSave(field, editValue || null);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || "");
    setSelectedMulti(multiSelectValues);
    setIsEditing(false);
    setDateOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && type !== "textarea") {
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

  const toggleMultiSelect = (val: string) => {
    setSelectedMulti(prev => 
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
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

      case "select":
        const selectValue = editValue || "__none__";
        return (
          <div className="flex items-center gap-2 w-full">
            <Select
              value={selectValue}
              onValueChange={(val) => {
                const actualValue = val === "__none__" ? "" : val;
                setEditValue(actualValue);
                onSave(field, actualValue);
                setIsEditing(false);
              }}
            >
              <SelectTrigger className="flex-1" data-testid={`select-${field}`}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.value || "__none__"} value={opt.value || "__none__"}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="icon" variant="ghost" onClick={handleCancel} data-testid={`button-cancel-${field}`}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        );

      case "date":
        const parsedDate = editValue ? parseDateOnly(editValue) : null;
        return (
          <div className="flex items-center gap-2 w-full">
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
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
                      onSave(field, formatted);
                    } else {
                      onSave(field, null);
                    }
                    setDateOpen(false);
                    setIsEditing(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button size="icon" variant="ghost" onClick={() => { onSave(field, null); setIsEditing(false); }} data-testid={`button-clear-${field}`}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        );

      case "multiselect":
        return (
          <div className="flex flex-col gap-2 w-full">
            <div className="flex flex-wrap gap-2">
              {options.map((opt) => (
                <Badge
                  key={opt.value}
                  variant={selectedMulti.includes(opt.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleMultiSelect(opt.value)}
                  data-testid={`badge-toggle-${opt.value.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
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
          <div className="flex items-center gap-2 w-full">
            <Input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="flex-1 text-sm"
              data-testid={`input-${field}`}
            />
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
                  <span className={cn("whitespace-pre-wrap", valueClassName)}>{value}</span>
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
  colSpan = 1,
}: {
  label: string;
  children: React.ReactNode;
  testId?: string;
  colSpan?: number;
}) {
  return (
    <div
      className={`flex py-4 border-b border-border/50 last:border-b-0 col-span-${colSpan}`}
      data-testid={testId}
    >
      <div className="w-2/5 text-sm font-semibold shrink-0">{label}</div>
      <div className="flex-1 text-sm">{children}</div>
    </div>
  );
}

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: deal, isLoading } = useQuery<DealWithRelations>({
    queryKey: ["/api/deals", id],
    enabled: Boolean(id),
  });

  const { data: users = [] } = useQuery<Pick<User, "id" | "firstName" | "lastName">[]>({
    queryKey: ["/api/users"],
  });

  const { data: clients = [] } = useQuery<Pick<Client, "id" | "name">[]>({
    queryKey: ["/api/clients"],
  });

  usePageTitle(deal?.displayName || "Deal");

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      return apiRequest("PATCH", `/api/deals/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", id] });
      toast({ title: "Deal updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update deal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFieldSave = (field: string, value: unknown) => {
    let processedValue = value;
    if (value === "" && (field === "ownerId" || field === "clientId" || field === "primaryContactId")) {
      processedValue = null;
    }
    updateMutation.mutate({ [field]: processedValue });
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/deals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({ title: "Deal deleted successfully" });
      setLocation("/deals");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete deal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Deals", href: "/deals" },
          { label: "Loading..." },
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (!deal) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Deals", href: "/deals" },
          { label: "Not Found" },
        ]}
      >
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Deal Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The deal you're looking for doesn't exist or has been deleted.
          </p>
          <Button
            onClick={() => setLocation("/deals")}
            data-testid="button-back-to-deals"
          >
            Back to Deals
          </Button>
        </div>
      </PageLayout>
    );
  }

  const createdByName = deal.createdBy
    ? [deal.createdBy.firstName, deal.createdBy.lastName]
        .filter(Boolean)
        .join(" ") || "Unknown"
    : "Unknown";
  const createdByInitials = createdByName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const ownerName = deal.owner
    ? [deal.owner.firstName, deal.owner.lastName].filter(Boolean).join(" ") ||
      "Unassigned"
    : null;
  const ownerInitials = ownerName
    ? ownerName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";

  const services = (deal.services as DealService[]) || [];

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Deals", href: "/deals" },
        { label: deal.displayName },
      ]}
      primaryAction={{
        label: "Edit",
        href: `/deals/${id}/edit`,
        icon: PenBox,
      }}
      additionalActions={
        isManagerOrAdmin
          ? [
              {
                label: "Delete",
                onClick: () => setShowDeleteDialog(true),
                icon: Trash2,
                variant: "destructive",
              },
            ]
          : undefined
      }
    >
      <div className="">
        <Tabs defaultValue="overview" className="w-full">
          <div className="sticky top-0 bg-background z-10">
            <div className="p-4 md:p-6 pb-2 md:pb-2">
              <div className="flex flex-col gap-2 ">
                <span className="text-sm font-semibold">
                  {deal.client?.name}
                </span>

                <h1
                  className="text-3xl font-bold"
                  data-testid="text-deal-name"
                >
                  {deal.displayName}
                </h1>
  

              </div>
            </div>

            <TabsList data-testid="tabs-deal" className="px-4 md:px-6">
              <TabsTrigger value="overview" data-testid="tab-overview">
                Overview
              </TabsTrigger>
              <TabsTrigger value="comments" data-testid="tab-comments">
                Comments
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="overview"
            className="max-w-4xl space-y-4 p-4 md:p-6 pt-4"
          >
            {/* Deal Information Card */}
            <Card>

              <CardContent className="py-2">
                <EditableFieldRow
                  label="Owner"
                  value={deal.ownerId || ""}
                  field="ownerId"
                  testId="field-owner"
                  type="select"
                  options={[
                    { value: "", label: "Unassigned" },
                    ...users.map((u) => ({
                      value: u.id,
                      label: [u.firstName, u.lastName].filter(Boolean).join(" ") || "Unknown",
                    })),
                  ]}
                  onSave={handleFieldSave}
                  displayValue={
                    ownerName ? (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 rounded-full">
                          <AvatarImage
                            src={deal.owner?.profileImageUrl || undefined}
                            alt={ownerName}
                          />
                          <AvatarFallback className="text-xs">
                            {ownerInitials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{ownerName}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )
                  }
                  placeholder="Select owner"
                />

                <EditableFieldRow
                  label="Status"
                  value={deal.status}
                  field="status"
                  testId="field-status"
                  type="select"
                  options={dealStatuses.map((s) => ({ value: s, label: s }))}
                  onSave={handleFieldSave}
                  displayValue={<DealStatusBadge status={deal.status as DealStatus} />}
                  placeholder="Select status"
                />

                <EditableFieldRow
                  label="Client"
                  value={deal.clientId || ""}
                  field="clientId"
                  testId="field-client"
                  type="select"
                  options={clients.map((c) => ({ value: c.id, label: c.name }))}
                  onSave={handleFieldSave}
                  displayValue={
                    deal.client ? (
                      <Link href={`/clients/${deal.client.id}`}>
                        <span
                          className="text-primary hover:underline cursor-pointer"
                          data-testid="link-deal-client"
                        >
                          {deal.client.name}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">No client assigned</span>
                    )
                  }
                  placeholder="Select client"
                />

                <FieldRow label="Primary Contact" testId="field-primary-contact">
                  {deal.primaryContact ? (
                    <Link href={`/contacts/${deal.primaryContact.id}`}>
                      <p
                        className="text-primary hover:underline cursor-pointer"
                        data-testid="link-deal-primary-contact"
                      >
                        {deal.primaryContact.firstName} {deal.primaryContact.lastName}
                      </p>
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">No primary contact</span>
                  )}
                </FieldRow>

                <EditableFieldRow
                  label="Project Date"
                  value={deal.projectDate || ""}
                  field="projectDate"
                  testId="field-project-date"
                  type="text"
                  onSave={handleFieldSave}
                  placeholder="e.g., Q1 2025, March 15-17"
                />

                <EditableFieldRow
                  label="Locations"
                  value={deal.locationsText || ""}
                  field="locationsText"
                  testId="field-locations-text"
                  type="textarea"
                  onSave={handleFieldSave}
                  placeholder="Enter locations"
                />

                <EditableFieldRow
                  label="Concept"
                  value={deal.concept || ""}
                  field="concept"
                  testId="field-concept"
                  type="textarea"
                  onSave={handleFieldSave}
                  placeholder="Enter concept description"
                  valueClassName="text-base"
                />

                <EditableFieldRow
                  label="Services"
                  value=""
                  field="services"
                  testId="field-services"
                  type="multiselect"
                  options={dealServices.map((s) => ({ value: s, label: s }))}
                  multiSelectValues={services}
                  onSave={handleFieldSave}
                  displayValue={
                    services.length > 0 ? (
                      <div className="flex flex-wrap gap-2" data-testid="deal-services">
                        {services.map((service) => (
                          <Badge
                            key={service}
                            variant="secondary"
                            data-testid={`badge-service-${service.toLowerCase().replace(/\s+/g, "-")}`}
                            size="lg"
                            className="py-1 px-2 text-xs"
                          >
                            {service}
                          </Badge>
                        ))}
                      </div>
                    ) : undefined
                  }
                  placeholder="Select services"
                />

                <EditableFieldRow
                  label="Budget Notes"
                  value={deal.budgetNotes || ""}
                  field="budgetNotes"
                  testId="field-budget-notes"
                  type="textarea"
                  onSave={handleFieldSave}
                  placeholder="Enter budget notes"
                />

                <EditableFieldRow
                  label="Started"
                  value={deal.startedOn || ""}
                  field="startedOn"
                  testId="field-started-on"
                  type="date"
                  onSave={handleFieldSave}
                  displayValue={
                    deal.startedOn && parseDateOnly(deal.startedOn) ? (
                      <span className="font-medium">{format(parseDateOnly(deal.startedOn)!, "MMM d, yyyy")}</span>
                    ) : undefined
                  }
                  placeholder="Select date"
                />

                <EditableFieldRow
                  label="Last Contact"
                  value={deal.lastContactOn || ""}
                  field="lastContactOn"
                  testId="field-last-contact"
                  type="date"
                  onSave={handleFieldSave}
                  displayValue={
                    deal.lastContactOn && parseDateOnly(deal.lastContactOn) ? (
                      <span className="font-medium">{format(parseDateOnly(deal.lastContactOn)!, "MMM d, yyyy")}</span>
                    ) : undefined
                  }
                  placeholder="Select date"
                />

                <EditableFieldRow
                  label="Won"
                  value={deal.wonOn || ""}
                  field="wonOn"
                  testId="field-won-on"
                  type="date"
                  onSave={handleFieldSave}
                  displayValue={
                    deal.wonOn && parseDateOnly(deal.wonOn) ? (
                      <span className="font-medium">{format(parseDateOnly(deal.wonOn)!, "MMM d, yyyy")}</span>
                    ) : undefined
                  }
                  placeholder="Select date"
                />

                <EditableFieldRow
                  label="Next Steps"
                  value={deal.notes || ""}
                  field="notes"
                  testId="field-notes"
                  type="textarea"
                  onSave={handleFieldSave}
                  placeholder="Enter next steps"
                  valueClassName="text-base"
                />
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="comments" className="p-4 md:p-6 pt-4 max-w-4xl">
            <CommentList
              entityType="deal"
              entityId={id}
              currentUser={user || undefined}
            />
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deal.displayName}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </PageLayout>
  );
}
