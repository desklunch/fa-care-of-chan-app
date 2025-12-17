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
  Globe,
  Briefcase,
  SquarePen,
  Users,
  CircleDollarSign,
  StickyNote,
} from "lucide-react";
import type { ClientWithRelations, DealWithRelations } from "@shared/schema";
import { format } from "date-fns";
import { usePageTitle } from "@/hooks/use-page-title";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: client, isLoading, error } = useQuery<ClientWithRelations>({
    queryKey: ["/api/clients", id],
    enabled: !!id,
  });

  const { data: deals } = useQuery<DealWithRelations[]>({
    queryKey: ["/api/deals"],
    enabled: !!id,
    select: (data) => data.filter(deal => deal.clientId === id),
  });

  usePageTitle(client?.name || "Client");

  if (isLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Clients", href: "/clients" },
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

  if (error || !client) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Clients", href: "/clients" },
          { label: "Not Found" },
        ]}
      >
        <div className="p-6 max-w-5xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Building className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Client Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The client you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => setLocation("/clients")} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Clients
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

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

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Clients", href: "/clients" },
        { label: client.name },
      ]}
      primaryAction={{
        label: "Edit Client",
        href: `/clients/${id}/edit`,
        icon: SquarePen,
      }}
    >
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <Card className="border-card-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1
                      className="text-xl font-semibold"
                      data-testid="text-client-name"
                    >
                      {client.name}
                    </h1>
                    {client.industry && (
                      <Badge variant="outline" className="mt-1">
                        <Briefcase className="h-3 w-3 mr-1" />
                        {client.industry}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {client.domain && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Globe className="h-4 w-4" />
                    <a 
                      href={`https://${client.domain}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-primary hover:underline"
                    >
                      {client.domain}
                    </a>
                  </div>
                )}
                
                {client.createdAt && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Added {format(new Date(client.createdAt), "MMM d, yyyy")}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {client.about && (
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    About
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {client.about}
                  </p>
                </CardContent>
              </Card>
            )}
            
            {client.notes && (
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <StickyNote className="h-4 w-4" />
                    Internal Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {client.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="md:col-span-2 space-y-6">
            <Card className="border-card-border">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Contacts
                </CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/contacts/new?clientId=${id}`}>
                    Add Contact
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {client.clientContacts && client.clientContacts.length > 0 ? (
                  <div className="space-y-3">
                    {client.clientContacts.map((cc) => (
                      <Link
                        key={cc.id}
                        href={`/contacts/${cc.contact.id}`}
                        className="block p-3 rounded-lg border hover-elevate cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {cc.contact.firstName} {cc.contact.lastName}
                            </p>
                            {cc.contact.jobTitle && (
                              <p className="text-sm text-muted-foreground">
                                {cc.contact.jobTitle}
                              </p>
                            )}
                          </div>
                          {!cc.isActive && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No contacts linked to this client yet.
                  </p>
                )}
              </CardContent>
            </Card>
            
            <Card className="border-card-border">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CircleDollarSign className="h-4 w-4" />
                  Deals
                </CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/deals/new?clientId=${id}`}>
                    New Deal
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {deals && deals.length > 0 ? (
                  <div className="space-y-3">
                    {deals.map((deal) => (
                      <Link
                        key={deal.id}
                        href={`/deals/${deal.id}`}
                        className="block p-3 rounded-lg border hover-elevate cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {deal.eventPurpose || "Untitled Deal"}
                              {deal.eventFormat && ` - ${deal.eventFormat}`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {deal.primaryDate && (
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(deal.primaryDate), "MMM d, yyyy")}
                                </span>
                              )}
                              {deal.maxBudget && (
                                <span className="text-sm text-muted-foreground">
                                  ${deal.maxBudget}K budget
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge className={statusColors[deal.status] || ""}>
                            {deal.status}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No deals for this client yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
