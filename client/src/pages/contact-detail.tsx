import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Loader2,
  MapPin,
  Phone,
  Pencil,
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

  const { data: linkedClients = [] } = useQuery<Client[]>({
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
            
            {localLinkedClients.length > 0 ? (
              localLinkedClients.map((client, index) => (
                <FieldRow 
                  key={client.id} 
                  label={index === 0 ? "Client" : ""} 
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
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </FieldRow>
              ))
            ) : !showClientSearch ? (
              <FieldRow label="Client" testId="field-linked-client-empty">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowClientSearch(true)}
                  className="h-auto p-0 text-muted-foreground hover:text-primary"
                  data-testid="button-link-client-inline"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Link Client
                </Button>
              </FieldRow>
            ) : null}

            {showClientSearch && (
              <FieldRow label={localLinkedClients.length === 0 ? "Client" : ""} testId="field-client-search">
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

            {localLinkedClients.length > 0 && !showClientSearch && (
              <FieldRow label="" testId="field-add-another-client">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowClientSearch(true)}
                  className="h-auto p-0 text-muted-foreground hover:text-primary"
                  data-testid="button-link-another-client"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Link Another Client
                </Button>
              </FieldRow>
            )}

            <FieldRow label="Job Title" testId="field-contact-job-title">
              {contact.jobTitle ? (
                <div className="flex items-center gap-2">
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

      </div>
    </PageLayout>
  );
}
