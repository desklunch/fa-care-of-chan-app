import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  MapPin,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { SiInstagram, SiLinkedin } from "react-icons/si";
import type { Contact } from "@shared/schema";
import { format } from "date-fns";

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: contact, isLoading, error } = useQuery<Contact>({
    queryKey: ["/api/contacts", id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Contacts", href: "/contacts" },
          { label: "Loading..." },
        ]}
      >
        <div className="p-6 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <Skeleton className="h-32 w-32 rounded-full mb-4" />
                    <Skeleton className="h-6 w-40 mb-2" />
                    <Skeleton className="h-4 w-32 mb-4" />
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
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
        <div className="p-6 max-w-5xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Contact Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The contact you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => setLocation("/contacts")} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Contacts
              </Button>
            </CardContent>
          </Card>
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
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card className="border-card-border">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <h1
                    className="text-xl font-semibold mb-1"
                    data-testid="text-contact-name"
                  >
                    {fullName}
                  </h1>
                  {contact.jobTitle && (
                    <p
                      className="text-muted-foreground mb-4"
                      data-testid="text-contact-title"
                    >
                      {contact.jobTitle}
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-border space-y-3">
                  {contact.emailAddresses && contact.emailAddresses.length > 0 && (
                    <div className="space-y-2">
                      {contact.emailAddresses.map((email, index) => (
                        <a
                          key={index}
                          href={`mailto:${email}`}
                          className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                          data-testid={`link-email-${index}`}
                        >
                          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{email}</span>
                        </a>
                      ))}
                    </div>
                  )}
                  {contact.phoneNumbers && contact.phoneNumbers.length > 0 && (
                    <div className="space-y-2">
                      {contact.phoneNumbers.map((phone, index) => (
                        <a
                          key={index}
                          href={`tel:${phone}`}
                          className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                          data-testid={`link-phone-${index}`}
                        >
                          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{phone}</span>
                        </a>
                      ))}
                    </div>
                  )}
                  {contact.homeAddress && (
                    <div
                      className="flex items-start gap-3 text-sm"
                      data-testid="text-address"
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="whitespace-pre-wrap">{contact.homeAddress}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            <Card className="border-card-border">
              <CardHeader>
                <CardTitle className="text-lg">Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Job Title</p>
                      <p className="font-medium" data-testid="text-detail-job-title">
                        {contact.jobTitle || "Not specified"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date of Birth</p>
                      <p className="font-medium" data-testid="text-detail-dob">
                        {contact.dateOfBirth
                          ? format(new Date(contact.dateOfBirth), "MMMM d, yyyy")
                          : "Not specified"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {(contact.instagramUsername || contact.linkedinUsername) && (
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-lg">Social</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {contact.instagramUsername && (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center flex-shrink-0">
                          <SiInstagram className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Instagram</p>
                          <a
                            href={`https://instagram.com/${contact.instagramUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline"
                            data-testid="link-instagram"
                          >
                            @{contact.instagramUsername}
                          </a>
                        </div>
                      </div>
                    )}
                    {contact.linkedinUsername && (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center flex-shrink-0">
                          <SiLinkedin className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">LinkedIn</p>
                          <a
                            href={`https://linkedin.com/in/${contact.linkedinUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline"
                            data-testid="link-linkedin"
                          >
                            {contact.linkedinUsername}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
