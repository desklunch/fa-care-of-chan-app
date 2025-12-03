import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Users,
  FileText,
  ExternalLink,
  Star,
  Receipt,
  Briefcase,
  Contact,
} from "lucide-react";
import type { VendorWithRelations } from "@shared/schema";

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: vendor, isLoading, error } = useQuery<VendorWithRelations>({
    queryKey: ["/api/vendors", id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Vendors", href: "/vendors" },
          { label: "Loading..." },
        ]}
      >
        <div className="p-6 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <Skeleton className="h-20 w-20 rounded-lg mb-4" />
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-32 mb-4" />
                  </div>
                  <div className="space-y-3 mt-6 pt-6 border-t">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
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

  if (error || !vendor) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Vendors", href: "/vendors" },
          { label: "Not Found" },
        ]}
      >
        <div className="p-6 max-w-5xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Vendor Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The vendor you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => setLocation("/vendors")} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Vendors
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Vendors", href: "/vendors" },
        { label: vendor.businessName },
      ]}
    >
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <Card className="border-card-border">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="flex items-center gap-2 mb-1">
                    <h1
                      className="text-xl font-semibold"
                      data-testid="text-vendor-name"
                    >
                      {vendor.businessName}
                    </h1>
                    {vendor.isPreferred && (
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  {vendor.isPreferred && (
                    <Badge variant="secondary" className="mb-2" data-testid="badge-preferred">
                      Preferred Vendor
                    </Badge>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-border space-y-3">
                  {vendor.email && (
                    <a
                      href={`mailto:${vendor.email}`}
                      className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                      data-testid="link-email"
                    >
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{vendor.email}</span>
                    </a>
                  )}
                  {vendor.phone && (
                    <a
                      href={`tel:${vendor.phone}`}
                      className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                      data-testid="link-phone"
                    >
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{vendor.phone}</span>
                    </a>
                  )}
                  {vendor.website && (
                    <a
                      href={vendor.website.startsWith("http") ? vendor.website : `https://${vendor.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                      data-testid="link-website"
                    >
                      <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{vendor.website}</span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  )}
                  {vendor.address && (
                    <div
                      className="flex items-start gap-3 text-sm"
                      data-testid="text-address"
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="whitespace-pre-wrap">{vendor.address}</span>
                    </div>
                  )}
                  {vendor.capabilitiesDeck && (
                    <a
                      href={vendor.capabilitiesDeck.startsWith("http") ? vendor.capabilitiesDeck : `https://${vendor.capabilitiesDeck}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                      data-testid="link-capabilities"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>Capabilities Deck</span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

            {vendor.services && vendor.services.length > 0 && (
              <Card className="border-card-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Services
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {vendor.services.map((service) => (
                      <Badge
                        key={service.id}
                        variant="outline"
                        data-testid={`badge-service-${service.id}`}
                      >
                        {service.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="md:col-span-2 space-y-6">
            {vendor.notes && (
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap" data-testid="text-notes">
                    {vendor.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="border-card-border">
              <CardHeader>
                <CardTitle className="text-lg">Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Employee Count</p>
                      <p className="font-medium" data-testid="text-employee-count">
                        {vendor.employeeCount || "Not specified"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center flex-shrink-0">
                      <Receipt className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sales Tax</p>
                      <p className="font-medium" data-testid="text-sales-tax">
                        {vendor.chargesSalesTax ? "Charges sales tax" : "Does not charge sales tax"}
                      </p>
                      {vendor.salesTaxNotes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {vendor.salesTaxNotes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {vendor.diversityInfo && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Diversity Information</p>
                    <p className="text-sm" data-testid="text-diversity">
                      {vendor.diversityInfo}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {vendor.locations && vendor.locations.length > 0 && (
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Locations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {vendor.locations.map((location, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm p-2 rounded-md bg-accent/30"
                        data-testid={`location-${index}`}
                      >
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>
                          {location.displayName || `${location.city}, ${location.region}, ${location.country}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {vendor.contacts && vendor.contacts.length > 0 && (
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Contact className="h-5 w-5" />
                    Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {vendor.contacts.map((contact) => {
                      const contactName = `${contact.firstName} ${contact.lastName}`;
                      const contactInitials = `${contact.firstName[0]}${contact.lastName[0]}`.toUpperCase();
                      return (
                        <Link
                          key={contact.id}
                          href={`/contacts/${contact.id}`}
                          className="flex items-center gap-3 p-3 rounded-lg hover-elevate border border-border"
                          data-testid={`link-contact-${contact.id}`}
                        >
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary text-sm font-medium">
                              {contactInitials}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{contactName}</p>
                            {contact.jobTitle && (
                              <p className="text-sm text-muted-foreground truncate">
                                {contact.jobTitle}
                              </p>
                            )}
                          </div>
                          {contact.emailAddresses && contact.emailAddresses.length > 0 && (
                            <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-32">
                              {contact.emailAddresses[0]}
                            </span>
                          )}
                        </Link>
                      );
                    })}
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
