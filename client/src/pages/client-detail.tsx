import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import type { Client, DealWithRelations, DealStatus } from "@shared/schema";
import { Loader2, Pencil, Trash2, Globe, Building2, Handshake, Plus } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<DealStatus, { variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
  "Inquiry": { variant: "outline" },
  "Discovery": { variant: "secondary" },
  "Internal Review": { variant: "secondary", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  "Contracting": { variant: "secondary", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  "Won": { variant: "default", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  "Lost": { variant: "destructive" },
  "Canceled": { variant: "outline", className: "opacity-50" },
  "Declined": { variant: "outline", className: "opacity-50" },
};

export default function ClientDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: client, isLoading } = useQuery<Client>({
    queryKey: ["/api/clients", params.id],
  });

  const { data: deals = [], isLoading: isLoadingDeals } = useQuery<DealWithRelations[]>({
    queryKey: ["/api/clients", params.id, "deals"],
    enabled: Boolean(params.id),
  });

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
      <div className="max-w-4xl space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle data-testid="text-client-name">{client.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {client.industry && (
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <p data-testid="text-client-industry">{client.industry}</p>
                  </div>
                </div>
              )}

              {client.website && (
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Website</p>
                    <a
                      href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                      data-testid="link-client-website"
                    >
                      {client.website}
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex gap-6 text-sm text-muted-foreground">
                {client.createdAt && (
                  <span data-testid="text-client-created">
                    Created {format(new Date(client.createdAt), "MMM d, yyyy")}
                  </span>
                )}
                {client.updatedAt && (
                  <span data-testid="text-client-updated">
                    Updated {format(new Date(client.updatedAt), "MMM d, yyyy")}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="h-5 w-5" />
                Deals
              </CardTitle>
              <CardDescription>
                {deals.length} deal{deals.length !== 1 ? "s" : ""} associated with this client
              </CardDescription>
            </div>
            <Link href={`/deals/new?clientId=${params.id}`}>
              <Button size="sm" data-testid="button-add-deal">
                <Plus className="h-4 w-4 mr-1" />
                Add Deal
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoadingDeals ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : deals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Handshake className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No deals yet</p>
                <p className="text-sm">Create a deal to start tracking opportunities with this client.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {deals.map((deal) => {
                  const statusConfig = statusColors[deal.status as DealStatus] || { variant: "outline" as const };
                  return (
                    <Link href={`/deals/${deal.id}`} key={deal.id}>
                      <div
                        className="flex items-center justify-between p-3 rounded-md hover-elevate cursor-pointer border"
                        data-testid={`link-deal-${deal.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-muted-foreground">#{deal.dealNumber}</span>
                          <span className="font-medium">{deal.displayName}</span>
                        </div>
                        <Badge variant={statusConfig.variant} className={statusConfig.className}>
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
              Are you sure you want to delete "{client.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
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
