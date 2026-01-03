import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Calendar,
  Loader2,
  MapPin,
  Mail,
  Phone,
  Pencil,
  User,
  Briefcase,
  X,
  UserPlus,
  Globe,
} from "lucide-react";
import { SiInstagram, SiLinkedin } from "react-icons/si";
import type { Contact, Client } from "@shared/schema";
import { format } from "date-fns";
import { usePageTitle } from "@/hooks/use-page-title";
import { ClientLinkSearch } from "@/components/client-link-search";

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

  const { data: contact, isLoading, error } = useQuery<Contact>({
    queryKey: ["/api/contacts", id],
    enabled: !!id,
  });

  const { data: linkedClients = [], isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ["/api/contacts", id, "clients"],
    enabled: !!id,
  });

  const [localLinkedClients, setLocalLinkedClients] = useState<Client[]>([]);
  
  useEffect(() => {
    setLocalLinkedClients(linkedClients);
  }, [linkedClients]);

  const handleLinkClient = (client: Client) => {
    setLocalLinkedClients(prev => [...prev, client]);
    setShowClientSearch(false);
  };

  const handleUnlinkClient = (clientId: string) => {
    setLocalLinkedClients(prev => prev.filter(c => c.id !== clientId));
  };

  usePageTitle(contact ? `${contact.firstName} ${contact.lastName}` : "Contact");

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
      primaryAction={{
        label: "Edit Contact",
        href: `/contacts/${id}/edit`,
        icon: Pencil,
      }}
    >
      <div className="max-w-4xl space-y-6 p-4 md:p-6">
        <h1 className="text-3xl font-bold" data-testid="text-contact-name">
          {fullName}
        </h1>

        <Card>
          <CardContent className="pt-6">
            <FieldRow label="Job Title" testId="field-contact-job-title">
              {contact.jobTitle ? (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{contact.jobTitle}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Not set</span>
              )}
            </FieldRow>
            <FieldRow label="Email" testId="field-contact-email">
              {contact.emailAddresses && contact.emailAddresses.length > 0 ? (
                <div className="space-y-1">
                  {contact.emailAddresses.map((email, index) => (
                    <a
                      key={index}
                      href={`mailto:${email}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                      data-testid={`link-email-${index}`}
                    >
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{email}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">Not set</span>
              )}
            </FieldRow>
            <FieldRow label="Phone" testId="field-contact-phone">
              {contact.phoneNumbers && contact.phoneNumbers.length > 0 ? (
                <div className="space-y-1">
                  {contact.phoneNumbers.map((phone, index) => (
                    <a
                      key={index}
                      href={`tel:${phone}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                      data-testid={`link-phone-${index}`}
                    >
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{phone}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">Not set</span>
              )}
            </FieldRow>
            <FieldRow label="Address" testId="field-contact-address">
              {contact.homeAddress ? (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="whitespace-pre-wrap">{contact.homeAddress}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Not set</span>
              )}
            </FieldRow>
            <FieldRow label="Date of Birth" testId="field-contact-dob">
              {contact.dateOfBirth ? (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(contact.dateOfBirth), "MMMM d, yyyy")}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Not set</span>
              )}
            </FieldRow>
          </CardContent>
        </Card>

        {(contact.instagramUsername || contact.linkedinUsername) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Social
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contact.instagramUsername && (
                <FieldRow label="Instagram" testId="field-contact-instagram">
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
                </FieldRow>
              )}
              {contact.linkedinUsername && (
                <FieldRow label="LinkedIn" testId="field-contact-linkedin">
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
                </FieldRow>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Clients
              </CardTitle>
              <CardDescription>
                {localLinkedClients.length} client{localLinkedClients.length !== 1 ? "s" : ""} linked to this contact
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClientSearch(true)}
              disabled={showClientSearch}
              data-testid="button-link-client"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Link Client
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingClients ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {showClientSearch && (
                  <ClientLinkSearch
                    contactId={id!}
                    linkedClients={localLinkedClients}
                    onLink={handleLinkClient}
                    onUnlink={handleUnlinkClient}
                    showLinkedClients={false}
                    autoFocus
                    onClose={() => setShowClientSearch(false)}
                  />
                )}

                {localLinkedClients.length === 0 && !showClientSearch ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No clients linked yet</p>
                    <p className="text-sm">Click "Link Client" to add clients to this contact.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {localLinkedClients.map((client) => (
                      <div
                        key={client.id}
                        className="flex items-center justify-between p-3 rounded-md border"
                        data-testid={`client-item-${client.id}`}
                      >
                        <Link href={`/clients/${client.id}`}>
                          <div className="flex flex-col cursor-pointer hover:underline">
                            <span className="font-medium text-primary">
                              {client.name}
                            </span>
                            {client.industry && (
                              <span className="text-sm text-muted-foreground">{client.industry}</span>
                            )}
                          </div>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUnlinkClient(client.id)}
                          data-testid={`button-unlink-client-${client.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
