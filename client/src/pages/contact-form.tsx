import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Save, Plus, X, Loader2 } from "lucide-react";
import type { Contact } from "@shared/schema";
import { insertContactSchema } from "@shared/schema";
import { z } from "zod";
import { PermissionGate } from "@/components/permission-gate";
import { NoPermissionMessage } from "@/components/no-permission-message";

const formSchema = insertContactSchema.extend({
  phoneNumbers: z.array(z.string()).optional().nullable(),
  emailAddresses: z.array(z.string()).optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

export default function ContactForm() {
  const [, setLocation] = useProtectedLocation();
  const [matchNew] = useRoute("/contacts/new");
  const [matchEdit, editParams] = useRoute<{ id: string }>("/contacts/:id/edit");
  
  const isEditMode = !!matchEdit;
  const contactId = editParams?.id;
  const { toast } = useToast();

  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([""]);
  const [emailAddresses, setEmailAddresses] = useState<string[]>([""]);

  const { data: existingContact, isLoading: contactLoading } = useQuery<Contact>({
    queryKey: ["/api/contacts", contactId],
    enabled: isEditMode && !!contactId,
  });

  usePageTitle(isEditMode ? "Edit Contact" : "New Contact");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      jobTitle: "",
      homeAddress: "",
      instagramUsername: "",
      linkedinUsername: "",
      phoneNumbers: [],
      emailAddresses: [],
    },
  });

  useEffect(() => {
    if (isEditMode && existingContact) {
      form.reset({
        firstName: existingContact.firstName,
        lastName: existingContact.lastName,
        jobTitle: existingContact.jobTitle || "",
        homeAddress: existingContact.homeAddress || "",
        instagramUsername: existingContact.instagramUsername || "",
        linkedinUsername: existingContact.linkedinUsername || "",
        phoneNumbers: existingContact.phoneNumbers || [],
        emailAddresses: existingContact.emailAddresses || [],
      });
      setPhoneNumbers(existingContact.phoneNumbers?.length ? existingContact.phoneNumbers : [""]);
      setEmailAddresses(existingContact.emailAddresses?.length ? existingContact.emailAddresses : [""]);
    }
  }, [isEditMode, existingContact, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/contacts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Contact created successfully!" });
      setLocation("/contacts");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create contact", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("PATCH", `/api/contacts/${contactId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId] });
      toast({ title: "Contact updated successfully!" });
      setLocation(`/contacts/${contactId}`);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update contact", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const filteredPhones = phoneNumbers.filter(p => p.trim() !== "");
    const filteredEmails = emailAddresses.filter(e => e.trim() !== "");
    
    const submitData = {
      ...data,
      phoneNumbers: filteredPhones.length > 0 ? filteredPhones : null,
      emailAddresses: filteredEmails.length > 0 ? filteredEmails : null,
    };
    
    if (isEditMode) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const addPhoneNumber = () => {
    setPhoneNumbers([...phoneNumbers, ""]);
  };

  const removePhoneNumber = (index: number) => {
    if (phoneNumbers.length > 1) {
      setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index));
    }
  };

  const updatePhoneNumber = (index: number, value: string) => {
    const updated = [...phoneNumbers];
    updated[index] = value;
    setPhoneNumbers(updated);
  };

  const addEmailAddress = () => {
    setEmailAddresses([...emailAddresses, ""]);
  };

  const removeEmailAddress = (index: number) => {
    if (emailAddresses.length > 1) {
      setEmailAddresses(emailAddresses.filter((_, i) => i !== index));
    }
  };

  const updateEmailAddress = (index: number, value: string) => {
    const updated = [...emailAddresses];
    updated[index] = value;
    setEmailAddresses(updated);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isLoading = isEditMode && contactLoading;

  if (isLoading) {
    return (
      <PageLayout 
        breadcrumbs={[
          { label: "Contacts", href: "/contacts" },
          { label: isEditMode ? "Edit Contact" : "New Contact" }
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  const fullName = isEditMode && existingContact 
    ? `${existingContact.firstName} ${existingContact.lastName}` 
    : "";

  const handleHeaderSubmit = () => {
    form.handleSubmit(onSubmit)();
  };

  const handleCancel = () => {
    setLocation(isEditMode && contactId ? `/contacts/${contactId}` : "/contacts");
  };

  return (
    <PermissionGate 
      permission="contacts.write" 
      behavior="fallback"
      fallback={
        <PageLayout 
          breadcrumbs={[
            { label: "Contacts", href: "/contacts" },
            { label: isEditMode ? "Edit Contact" : "New Contact" }
          ]}
        >
          <NoPermissionMessage 
            title="Permission Required"
            message="You don't have permission to create or edit contacts. Please contact an administrator if you need access."
          />
        </PageLayout>
      }
    >
      <PageLayout 
        breadcrumbs={[
          { label: "Contacts", href: "/contacts" },
          ...(isEditMode && existingContact ? [{ label: fullName, href: `/contacts/${contactId}` }] : []),
          { label: isEditMode ? "Edit" : "New Contact" }
        ]}
        primaryAction={{
          label: isEditMode ? "Save Changes" : "Create Contact",
          icon: Save,
          onClick: handleHeaderSubmit,
        }}
        additionalActions={[
          {
            label: "Cancel",
            icon: X,
            onClick: handleCancel,
          },
        ]}
      >
      <div className="max-w-2xl p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{isEditMode ? "Edit Contact" : "Contact Info"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <div className="w-full flex justify-between items-center">
                          <FormLabel>First Name</FormLabel>
                          <span className="text-xs font-medium text-muted-foreground">Required</span>
                        </div>
                        <FormControl>
                          <Input 
                            placeholder="John" 
                            {...field} 
                            data-testid="input-first-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <div className="w-full flex justify-between items-center">
                          <FormLabel>Last Name</FormLabel>
                          <span className="text-xs font-medium text-muted-foreground">Required</span>
                        </div>
                        <FormControl>
                          <Input 
                            placeholder="Doe" 
                            {...field} 
                            data-testid="input-last-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Software Engineer" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-job-title"
                        />
                      </FormControl>
                      <FormDescription>
                        The contact's role or position.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Methods</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <FormLabel>Email Addresses</FormLabel>
                  {emailAddresses.map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => updateEmailAddress(index, e.target.value)}
                        data-testid={`input-email-${index}`}
                      />
                      {emailAddresses.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEmailAddress(index)}
                          data-testid={`button-remove-email-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEmailAddress}
                    data-testid="button-add-email"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Email
                  </Button>
                </div>

                <div className="space-y-3">
                  <FormLabel>Phone Numbers</FormLabel>
                  {phoneNumbers.map((phone, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={phone}
                        onChange={(e) => updatePhoneNumber(index, e.target.value)}
                        data-testid={`input-phone-${index}`}
                      />
                      {phoneNumbers.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePhoneNumber(index)}
                          data-testid={`button-remove-phone-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPhoneNumber}
                    data-testid="button-add-phone"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Phone
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name="homeAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Home Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="123 Main St, City, State 12345"
                          className="min-h-[80px] resize-y"
                          {...field} 
                          value={field.value || ""}
                          data-testid="textarea-address"
                        />
                      </FormControl>
                      <FormDescription>
                        Physical mailing address.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Social Profiles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="instagramUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="@username" 
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-instagram"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="linkedinUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="john-doe" 
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-linkedin"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
      </PageLayout>
    </PermissionGate>
  );
}
