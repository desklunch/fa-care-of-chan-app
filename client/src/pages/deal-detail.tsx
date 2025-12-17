import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Building,
  Calendar,
  CircleDollarSign,
  Users,
  MapPin,
  SquarePen,
  User,
  Briefcase,
  CalendarDays,
  StickyNote,
  Lightbulb,
} from "lucide-react";
import type { DealWithRelations } from "@shared/schema";
import { format } from "date-fns";
import { usePageTitle } from "@/hooks/use-page-title";

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: deal, isLoading, error } = useQuery<DealWithRelations>({
    queryKey: ["/api/deals", id],
    enabled: !!id,
  });

  usePageTitle(deal?.eventPurpose || "Deal");

  const statusColors: Record<string, string> = {
    "Inquiry": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    "Discovery": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    "Internal Review": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    "Contracting": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    "Won": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    "Lost": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    "Cancelled": "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    "Declined": "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  };

  if (isLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Deals", href: "/deals" },
          { label: "Loading..." },
        ]}
      >
        <div className="p-6 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-40 mb-2" />
                  <Skeleton className="h-4 w-32 mb-4" />
                  <Skeleton className="h-20 w-full" />
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

  if (error || !deal) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Deals", href: "/deals" },
          { label: "Not Found" },
        ]}
      >
        <div className="p-6 max-w-5xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <CircleDollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Deal Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The deal you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => setLocation("/deals")} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Deals
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  const dealTitle = deal.eventPurpose || "Untitled Deal";

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Deals", href: "/deals" },
        { label: dealTitle },
      ]}
      primaryAction={{
        label: "Edit Deal",
        href: `/deals/${id}/edit`,
        icon: SquarePen,
      }}
    >
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <Card className="border-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h1
                    className="text-xl font-semibold"
                    data-testid="text-deal-title"
                  >
                    {dealTitle}
                  </h1>
                  <Badge className={statusColors[deal.status] || ""}>
                    {deal.status}
                  </Badge>
                </div>

                {deal.eventFormat && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {deal.eventFormat}
                  </p>
                )}

                <div className="space-y-3 mt-4">
                  {deal.client && (
                    <div className="flex items-start gap-2">
                      <Building className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Client</p>
                        <Link 
                          href={`/clients/${deal.client.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {deal.client.name}
                        </Link>
                      </div>
                    </div>
                  )}

                  {deal.primaryContact && (
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Primary Contact</p>
                        <Link 
                          href={`/contacts/${deal.primaryContact.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {deal.primaryContact.firstName} {deal.primaryContact.lastName}
                        </Link>
                      </div>
                    </div>
                  )}

                  {deal.owner && (
                    <div className="flex items-start gap-2">
                      <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Owner</p>
                        <p className="text-sm text-muted-foreground">
                          {deal.owner.firstName} {deal.owner.lastName}
                        </p>
                      </div>
                    </div>
                  )}

                  {deal.maxBudget && (
                    <div className="flex items-start gap-2">
                      <CircleDollarSign className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Max Budget</p>
                        <p className="text-sm text-muted-foreground">
                          ${deal.maxBudget}K (${(deal.maxBudget * 1000).toLocaleString()})
                        </p>
                      </div>
                    </div>
                  )}

                  {deal.guestCount && (
                    <div className="flex items-start gap-2">
                      <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Guest Count</p>
                        <p className="text-sm text-muted-foreground">
                          {deal.guestCount} guests
                        </p>
                      </div>
                    </div>
                  )}

                  {deal.services && (
                    <div className="flex items-start gap-2">
                      <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Services</p>
                        <p className="text-sm text-muted-foreground">
                          {deal.services}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {deal.createdAt && (
                  <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Added {format(new Date(deal.createdAt), "MMM d, yyyy")}
                  </div>
                )}
              </CardContent>
            </Card>

            {deal.dateType && (
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Event Dates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Date Type</p>
                    <p className="text-sm text-muted-foreground">{deal.dateType}</p>
                  </div>

                  {deal.dateType !== "Unconfirmed" && deal.primaryDate && (
                    <div>
                      <p className="text-sm font-medium">Primary Date</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(deal.primaryDate), "MMMM d, yyyy")}
                      </p>
                    </div>
                  )}

                  {(deal.dateType === "Single Day" || deal.dateType === "Multi Day") && (
                    <div>
                      <p className="text-sm font-medium">Date Flexibility</p>
                      <p className="text-sm text-muted-foreground">
                        {deal.isDateFlexible ? "Flexible" : "Fixed"}
                      </p>
                    </div>
                  )}

                  {(deal.dateType === "Single Day" || deal.dateType === "Multi Day") && 
                   deal.isDateFlexible && 
                   deal.alternativeDates && 
                   deal.alternativeDates.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Alternative Dates</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {deal.alternativeDates.map((date, idx) => (
                          <Badge key={idx} variant="secondary">
                            {format(new Date(date), "MMM d, yyyy")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {deal.dateType === "Multi Day" && deal.numberOfDays && deal.numberOfDays >= 2 && (
                    <div>
                      <p className="text-sm font-medium">Duration</p>
                      <p className="text-sm text-muted-foreground">{deal.numberOfDays} days</p>
                    </div>
                  )}

                  {deal.dateType === "Unconfirmed" && deal.estimatedMonths && deal.estimatedMonths.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Estimated Months</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {deal.estimatedMonths.map((month, idx) => (
                          <Badge key={idx} variant="secondary">{month}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {deal.locations && deal.locations.length > 0 && (
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Locations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {deal.locations.map((location, idx) => (
                      <div key={idx} className="text-sm">
                        <p className="font-medium">{location.displayName}</p>
                        <p className="text-muted-foreground">{location.city}, {location.region}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="md:col-span-2 space-y-6">
            {deal.eventConcept && (
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Event Concept
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {deal.eventConcept}
                  </p>
                </CardContent>
              </Card>
            )}

            {deal.notes && (
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <StickyNote className="h-4 w-4" />
                    Internal Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {deal.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {!deal.eventConcept && !deal.notes && (
              <Card className="border-card-border">
                <CardContent className="p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <StickyNote className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    No additional notes or event concept added yet.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setLocation(`/deals/${id}/edit`)}
                  >
                    <SquarePen className="h-4 w-4 mr-2" />
                    Add Details
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
