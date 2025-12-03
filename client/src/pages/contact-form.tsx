import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Save, Trash2, Plus, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Contact } from "@shared/schema";
import { insertContactSchema } from "@shared/schema";
import { z } from "zod";

const formSchema = insertContactSchema.extend({
  phoneNumbers: z.array(z.string()).optional().nullable(),
  emailAddresses: z.array(z.string()).optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

export default function ContactForm() {
  const [, setLocation] = useLocation();
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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/contacts/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Contact deleted successfully!" });
      setLocation("/contacts");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete contact", 
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

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const isLoading = isEditMode && contactLoading;

  if (isLoading) {
    return (
      <PageLayout 
        breadcrumbs={[
          { label: "Contacts", href: "/contacts" },
          { label: isEditMode ? "Edit Contact" : "New Contact" }
        ]}
      >
        <div className="p-6 max-w-2xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  const backUrl = isEditMode && contactId ? `/contacts/${contactId}` : "/contacts";
  const fullName = isEditMode && existingContact 
    ? `${existingContact.firstName} ${existingContact.lastName}` 
    : "";

  return (
    <PageLayout 
      breadcrumbs={[
        { label: "Contacts", href: "/contacts" },
        ...(isEditMode && existingContact ? [{ label: fullName, href: `/contacts/${contactId}` }] : []),
        { label: isEditMode ? "Edit" : "New Contact" }
      ]}
    >
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href={backUrl}>
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? "Edit Contact" : "Add New Contact"}</CardTitle>
            <CardDescription>
              {isEditMode 
                ? "Update the contact's information."
                : "Enter the details for the new contact."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
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
                        <FormLabel>Last Name *</FormLabel>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          className="min-h-[80px]"
                          {...field} 
                          value={field.value || ""}
                          data-testid="textarea-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <div className="flex gap-3 pt-4 justify-between">
                  <div className="flex gap-3">
                    <Link href={backUrl}>
                      <Button 
                        type="button" 
                        variant="outline"
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                    </Link>
                    <Button 
                      type="submit" 
                      disabled={isPending}
                      data-testid="button-save"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isPending 
                        ? (isEditMode ? "Saving..." : "Creating...") 
                        : (isEditMode ? "Save Changes" : "Create Contact")
                      }
                    </Button>
                  </div>
                  {isEditMode && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          type="button" 
                          variant="destructive"
                          disabled={isPending}
                          data-testid="button-delete"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this contact? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid="button-confirm-delete"
                          >
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
