import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import type {
  Client,
  DealWithRelations,
  DealStatus,
  Contact,
  Industry,
} from "@shared/schema";
import {
  Loader2,
  Pencil,
  Trash2,
  Globe,
  Building2,
  Handshake,
  Users,
  Plus,
  UserPlus,

} from "lucide-react";
import { format } from "date-fns";
import { ContactLinkSearch } from "@/components/contact-link-search";

const statusColors: Record<
  DealStatus,
  {
    variant: "default" | "secondary" | "outline" | "destructive";
    className?: string;
  }
> = {
  Prospecting: { variant: "outline" },
  "Warm Lead": { variant: "secondary" },
  Proposal: {
    variant: "secondary",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  Feedback: { variant: "secondary" },
  Contracting: {
    variant: "secondary",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  "In Progress": {
    variant: "default",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  "Final Invoicing": { variant: "default" },
  Complete: {
    variant: "default",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  "No-Go": { variant: "destructive" },
  Canceled: { variant: "outline", className: "opacity-50" },
};

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

export default function ClientDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showContactSearch, setShowContactSearch] = useState(false);

  const { data: client, isLoading } = useQuery<Client>({
    queryKey: ["/api/clients", params.id],
  });

  const { data: deals = [], isLoading: isLoadingDeals } = useQuery<
    DealWithRelations[]
  >({
    queryKey: ["/api/clients", params.id, "deals"],
    enabled: Boolean(params.id),
  });

  // Fetch industries for lookup
  const { data: industries = [] } = useQuery<Industry[]>({
    queryKey: ["/api/industries"],
  });

  // Create industries lookup map
  const industriesMap = new Map(industries.map((i) => [i.id, i]));

  const { data: linkedContacts = [], isLoading: isLoadingContacts } = useQuery<
    Contact[]
  >({
    queryKey: ["/api/clients", params.id, "contacts"],
    enabled: Boolean(params.id),
  });

  const [localLinkedContacts, setLocalLinkedContacts] = useState<Contact[]>([]);

  useEffect(() => {
    setLocalLinkedContacts(linkedContacts);
  }, [linkedContacts]);

  const handleLinkContact = (contact: Contact) => {
    setLocalLinkedContacts((prev) => [...prev, contact]);
    setShowContactSearch(false);
  };

  const handleUnlinkContact = (contactId: string) => {
    setLocalLinkedContacts((prev) => prev.filter((c) => c.id !== contactId));
  };

  usePageTitle(client?.name || "Client Details");

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/clients/${params.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client deleted",
        description: "The client has been removed from your directory.",
      });
      setLocation("/clients");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete client",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Clients", href: "/clients" },
          { label: "Loading..." },
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (!client) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Clients", href: "/clients" },
          { label: "Not Found" },
        ]}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Client not found</p>
          <Button variant="outline" onClick={() => setLocation("/clients")}>
            Back to Clients
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Clients", href: "/clients" },
        { label: client.name },
      ]}
      primaryAction={{
        label: "Edit Client",
        href: `/clients/${params.id}/edit`,
        icon: Pencil,
      }}
      additionalActions={[
        {
          label: "Delete Client",
          onClick: () => setShowDeleteDialog(true),
          icon: Trash2,
          variant: "destructive",
        },
      ]}
    >
      <div className="max-w-4xl space-y-6 p-4 md:p-6">
        <h1 className="text-3xl font-bold" data-testid="text-client-name">
          {client.name}
        </h1>

        <Card>
          <CardContent className="py-4">
            <FieldRow label="Industry" testId="field-client-industry">
              {client.industryId ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {industriesMap.get(client.industryId)?.name ||
                      client.industryId}
                  </Badge>
                </div>
              ) : (
                <span className="text-muted-foreground">Not set</span>
              )}
            </FieldRow>
            <FieldRow label="Website" testId="field-client-website">
              {client.website ? (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={
                      client.website.startsWith("http")
                        ? client.website
                        : `https://${client.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                    data-testid="link-client-website"
                  >
                    {client.website}
                  </a>
                </div>
              ) : (
                <span className="text-muted-foreground">Not set</span>
              )}
            </FieldRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pt-2 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold pt-2">
                Contacts{" "}
                <span className="text-muted-foreground text-sm font-medium">
                  {localLinkedContacts.length}
                </span>
              </CardTitle>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowContactSearch(true)}
              disabled={showContactSearch}
              data-testid="button-link-contact"
            >
              <UserPlus className="h-4 w-4" />
              Add
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingContacts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {showContactSearch && (
                  <ContactLinkSearch
                    clientId={params.id!}
                    linkedContacts={localLinkedContacts}
                    onLink={handleLinkContact}
                    onUnlink={handleUnlinkContact}
                    showLinkedContacts={false}
                    autoFocus
                    onClose={() => setShowContactSearch(false)}
                  />
                )}

                {localLinkedContacts.length === 0 && !showContactSearch ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No contacts linked yet</p>
                    <p className="text-sm">
                      Click "Link Contact" to add contacts to this client.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {localLinkedContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 pl-4 rounded-lg border bg-foreground/[3%]"
                        data-testid={`contact-item-${contact.id}`}
                      >
                        <div>
                          <div className="flex flex-col  ">
                            <Link href={`/contacts/${contact.id}`}>
                              <span className="font-medium text-primary hover:underline cursor-pointer">
                                {[contact.firstName, contact.lastName]
                                  .filter(Boolean)
                                  .join(" ")}
                              </span>
                            </Link>

                            {contact.jobTitle && (
                              <span className="text-sm text-muted-foreground">
                                {contact.jobTitle}
                              </span>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUnlinkContact(contact.id)}
                          data-testid={`button-unlink-contact-${contact.id}`}
                          className=" w-9 h-9 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="!h-[18px] !w-[18px] !stroke-[1.5px]" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                Deals
                <span className="text-muted-foreground text-sm font-medium">{deals.length}</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingDeals ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : deals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Handshake className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No deals yet</p>
                <p className="text-sm">
                  Create a deal to start tracking opportunities with this
                  client.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {deals.map((deal) => {
                  const statusConfig = statusColors[
                    deal.status as DealStatus
                  ] || { variant: "outline" as const };
                  return (
                    <Link href={`/deals/${deal.id}`} key={deal.id}>
                      <div
                        className="flex items-center justify-between p-3 rounded-md hover-elevate cursor-pointer border bg-foreground/[3%]"
                        data-testid={`link-deal-${deal.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">
                            {deal.displayName}
                          </span>
                        </div>
                        <Badge
                          variant={statusConfig.variant}
                          className={statusConfig.className}
                        >
                          {deal.status}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{client.name}"? This action
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
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
