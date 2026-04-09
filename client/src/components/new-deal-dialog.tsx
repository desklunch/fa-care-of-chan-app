import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Calendar, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ClientSearch } from "@/components/client-search";
import { DealStatusBadge } from "@/components/deal-status-badge";
import { useDealStatuses } from "@/hooks/useDealStatuses";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Contact, Deal, User } from "@shared/schema";

const quickDealSchema = z.object({
  displayName: z.string().min(1, "Name is required").max(255, "Name must be 255 characters or less"),
  clientId: z.string().min(1, "Client is required"),
  primaryContactId: z.string().optional().transform(val => val || undefined),
  ownerId: z.string().optional().transform(val => val || undefined),
  status: z.number().int(),
  startedOn: z.string().nullable().optional(),
  lastContactOn: z.string().nullable().optional(),
});

type QuickDealValues = z.infer<typeof quickDealSchema>;

interface NewDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatedAndEdit?: (dealId: string) => void;
}

export function NewDealDialog({ open, onOpenChange, onCreatedAndEdit }: NewDealDialogProps) {
  const { toast } = useToast();
  const { statuses: dealStatusList, defaultStatus } = useDealStatuses();
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);
  const [createContactOpen, setCreateContactOpen] = useState(false);
  const [newContactFirstName, setNewContactFirstName] = useState("");
  const [newContactLastName, setNewContactLastName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactErrors, setNewContactErrors] = useState<Record<string, string>>({});

  const form = useForm<QuickDealValues>({
    resolver: zodResolver(quickDealSchema),
    defaultValues: {
      displayName: "",
      clientId: "",
      primaryContactId: "",
      ownerId: "",
      status: 0,
      startedOn: format(new Date(), "yyyy-MM-dd"),
      lastContactOn: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const watchedClientId = form.watch("clientId");

  useEffect(() => {
    if (defaultStatus && form.getValues("status") === 0) {
      form.setValue("status", defaultStatus.id);
    }
  }, [defaultStatus, form]);

  const { data: linkedContacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/clients', watchedClientId, 'contacts'],
    enabled: Boolean(watchedClientId),
  });

  useEffect(() => {
    form.setValue("primaryContactId", "");
  }, [watchedClientId, form]);

  const createContactMutation = useMutation({
    mutationFn: async () => {
      if (!watchedClientId) {
        throw new Error("No client selected");
      }
      const errors: Record<string, string> = {};
      if (!newContactFirstName.trim()) errors.firstName = "First name is required";
      if (!newContactLastName.trim()) errors.lastName = "Last name is required";
      if (!newContactEmail.trim()) errors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newContactEmail.trim())) errors.email = "Invalid email address";
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
      await apiRequest("POST", `/api/contacts/${contact.id}/clients/${watchedClientId}`);
      return contact;
    },
    onSuccess: (contact) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', watchedClientId, 'contacts'] });
      form.setValue("primaryContactId", contact.id);
      setCreateContactOpen(false);
      setNewContactFirstName("");
      setNewContactLastName("");
      setNewContactEmail("");
      setNewContactErrors({});
    },
    onError: (error: Error) => {
      if (error.message !== "Validation failed") {
        toast({ title: "Failed to create contact", description: error.message, variant: "destructive" });
      }
    },
  });

  const createDealMutation = useMutation({
    mutationFn: async (data: QuickDealValues) => {
      const response = await apiRequest("POST", "/api/deals", data);
      return response.json();
    },
  });

  const resetForm = () => {
    form.reset({
      displayName: "",
      clientId: "",
      primaryContactId: "",
      ownerId: "",
      status: defaultStatus?.id || 0,
      startedOn: format(new Date(), "yyyy-MM-dd"),
      lastContactOn: format(new Date(), "yyyy-MM-dd"),
    });
    setSelectedClient(null);
    setCreateContactOpen(false);
    setNewContactFirstName("");
    setNewContactLastName("");
    setNewContactEmail("");
    setNewContactErrors({});
  };

  const handleSubmit = async (data: QuickDealValues, andEdit: boolean) => {
    try {
      const newDeal: Deal = await createDealMutation.mutateAsync(data);
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({ title: "Deal created successfully" });
      onOpenChange(false);
      resetForm();
      setTimeout(() => {
        document.body.style.removeProperty("pointer-events");
      }, 300);
      if (andEdit && onCreatedAndEdit) {
        onCreatedAndEdit(newDeal.id);
      }
    } catch {
      toast({ title: "Failed to create deal", variant: "destructive" });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
    if (!newOpen) {
      setTimeout(() => {
        document.body.style.removeProperty("pointer-events");
      }, 300);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Deal</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <div className="w-full flex justify-between items-center">
                      <FormLabel>Deal Name</FormLabel>
                      <span className="text-xs font-medium text-muted-foreground">Required</span>
                    </div>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter deal name..."
                        data-testid="input-quick-deal-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger data-testid="select-quick-deal-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dealStatusList.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            <div className="min-w-48 w-fit">
                              <DealStatusBadge status={s.name} />
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal Owner</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger
                          className={cn(!field.value || field.value === "__none__" ? "text-muted-foreground" : "")}
                          data-testid="select-quick-deal-owner"
                        >
                          <SelectValue placeholder="Select owner..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">No owner</SelectItem>
                        {users.filter(u => u.isActive && (u.role === "Sales" || u.role === "Sales Admin")).map((user) => (
                          <SelectItem key={user.id} value={user.id} data-testid={`select-quick-owner-${user.id}`}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <div className="w-full flex justify-between items-center">
                      <FormLabel>Client</FormLabel>
                      <span className="text-xs font-medium text-muted-foreground">Required</span>
                    </div>
                    <FormControl>
                      <ClientSearch
                        selectedClientId={field.value || null}
                        selectedClientName={selectedClient?.name || null}
                        onSelect={(client) => {
                          if (client) {
                            field.onChange(client.id);
                            setSelectedClient(client);
                          } else {
                            field.onChange("");
                            setSelectedClient(null);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedClientId && (
                <FormField
                  control={form.control}
                  name="primaryContactId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Contact</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          if (val === "__create_new__") {
                            setCreateContactOpen(true);
                            return;
                          }
                          field.onChange(val === "__none__" ? "" : val);
                        }}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger
                            className={cn(!field.value || field.value === "__none__" ? "text-muted-foreground" : "")}
                            data-testid="select-quick-primary-contact"
                          >
                            <SelectValue placeholder="Select primary contact..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">
                            {linkedContacts.length === 0 ? (
                              <span className="text-xs">No contacts found for this client</span>
                            ) : "None"}
                          </SelectItem>
                          {linkedContacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id} data-testid={`select-quick-contact-${contact.id}`}>
                              {contact.firstName} {contact.lastName}
                            </SelectItem>
                          ))}
                          <SelectItem value="__create_new__" data-testid="select-quick-create-new-contact">
                            <span className="flex items-center gap-2">
                              <Plus className="h-3.5 w-3.5" />
                              Create New Contact
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}


              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-2">
                <FormField
                  control={form.control}
                  name="startedOn"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Started On</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="bg-background border-input w-full font-normal items-center justify-between px-3"
                              data-testid="button-quick-started-on"
                            >
                              <div className="flex">
                                <Calendar className="mr-2 h-4 w-4" />
                                {field.value ? format(parseISO(field.value), "MMM d, yyyy") : "Select date"}
                              </div>
                              {field.value && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-auto h-full px-2"
                                  onClick={() => field.onChange(null)}
                                >
                                  Clear
                                </Button>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value ? parseISO(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : null)}
                            initialFocus
                          />
                          {field.value && (
                            <div className="p-2 border-t">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full"
                                onClick={() => field.onChange(null)}
                              >
                                Clear
                              </Button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastContactOn"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Last Contact</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="bg-background border-input w-full font-normal items-center justify-between px-3"
                              data-testid="button-quick-last-contact"
                            >
                              <div className="flex">
                                <Calendar className="mr-2 h-4 w-4" />
                                {field.value ? format(parseISO(field.value), "MMM d, yyyy") : "Select date"}
                              </div>
                              {field.value && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-auto h-full px-2"
                                  onClick={() => field.onChange(null)}
                                >
                                  Clear
                                </Button>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value ? parseISO(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : null)}
                            initialFocus
                          />
                          {field.value && (
                            <div className="p-2 border-t">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full"
                                onClick={() => field.onChange(null)}
                              >
                                Clear
                              </Button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="flex flex-row justify-between gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  data-testid="button-cancel-quick-deal"
                >
                  Cancel
                </Button>
                <div className="flex flex-row gap-2">
                  <Button
                    variant="outline"
                    disabled={createDealMutation.isPending}
                    onClick={() => form.handleSubmit((data) => handleSubmit(data, true))()}
                    data-testid="button-create-and-edit-deal"
                  >
                    {createDealMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create & Edit
                  </Button>
                  <Button
                    disabled={createDealMutation.isPending}
                    onClick={() => form.handleSubmit((data) => handleSubmit(data, false))()}
                    data-testid="button-create-quick-deal"
                  >
                    {createDealMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Deal
                  </Button>
                </div>
    
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={createContactOpen} onOpenChange={(open) => {
        setCreateContactOpen(open);
        if (!open) {
          setNewContactErrors({});
          setNewContactFirstName("");
          setNewContactLastName("");
          setNewContactEmail("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Contact</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quick-new-contact-first-name">First Name</Label>
              <Input
                id="quick-new-contact-first-name"
                data-testid="input-quick-new-contact-first-name"
                value={newContactFirstName}
                onChange={(e) => { setNewContactFirstName(e.target.value); setNewContactErrors((prev) => { const { firstName, ...rest } = prev; return rest; }); }}
                placeholder="First name"
              />
              {newContactErrors.firstName && <p className="text-sm text-destructive">{newContactErrors.firstName}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quick-new-contact-last-name">Last Name</Label>
              <Input
                id="quick-new-contact-last-name"
                data-testid="input-quick-new-contact-last-name"
                value={newContactLastName}
                onChange={(e) => { setNewContactLastName(e.target.value); setNewContactErrors((prev) => { const { lastName, ...rest } = prev; return rest; }); }}
                placeholder="Last name"
              />
              {newContactErrors.lastName && <p className="text-sm text-destructive">{newContactErrors.lastName}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quick-new-contact-email">Email</Label>
              <Input
                id="quick-new-contact-email"
                data-testid="input-quick-new-contact-email"
                type="email"
                value={newContactEmail}
                onChange={(e) => { setNewContactEmail(e.target.value); setNewContactErrors((prev) => { const { email, ...rest } = prev; return rest; }); }}
                placeholder="Email address"
              />
              {newContactErrors.email && <p className="text-sm text-destructive">{newContactErrors.email}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateContactOpen(false)} data-testid="button-cancel-quick-create-contact">Cancel</Button>
            <Button onClick={() => createContactMutation.mutate()} disabled={createContactMutation.isPending} data-testid="button-submit-quick-create-contact">
              {createContactMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
