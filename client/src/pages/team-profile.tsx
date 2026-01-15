import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommentList } from "@/components/ui/comments";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Mail,
  Phone,
  MapPin,
  Building2,
  SquarePen,
  ArrowLeft,
} from "lucide-react";
import type { User } from "@shared/schema";
import { usePageTitle } from "@/hooks/use-page-title";

export default function TeamProfile() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { can } = usePermissions();

  const { data: member, isLoading, error } = useQuery<User>({
    queryKey: ["/api/team", id],
    enabled: !!id,
  });

  usePageTitle(member ? `${member.firstName} ${member.lastName}` : "Team Member");

  const isOwnProfile = currentUser?.id === member?.id;
  const isAdmin = can('team.manage');
  const canEdit = isOwnProfile || isAdmin;

  if (isLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Team", href: "/team" },
          { label: "Loading..." },
        ]}
      >
        <div className="p-6 max-w-4xl">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error || !member) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Team", href: "/team" },
          { label: "Not Found" },
        ]}
      >
        <div className="p-6 max-w-4xl">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Team Member Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The team member you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => setLocation("/team")} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Team
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  const fullName =
    [member.firstName, member.lastName].filter(Boolean).join(" ") || "Unknown";
  const initials =
    `${member.firstName?.[0] || ""}${member.lastName?.[0] || ""}`.toUpperCase() || "U";

  const editHref = isOwnProfile ? "/profile/edit" : `/team/${id}/edit`;

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Team", href: "/team" },
        { label: fullName },
      ]}
      primaryAction={
        canEdit
          ? {
              label: "Edit Profile",
              icon: SquarePen,
              href: editHref,
            }
          : undefined
      }
    >
      <Tabs defaultValue="overview" className="w-full">
        <div className="sticky top-0 bg-background z-10">
          <div className="p-4 md:p-6 pb-2 md:pb-2">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold" data-testid="text-member-name">
                {fullName}
              </h1>
              <div className="flex flex-wrap gap-2">
                {member.title && (
                  <span className="text-muted-foreground" data-testid="text-member-title">
                    {member.title}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {member.department && (
                  <Badge variant="secondary" data-testid="badge-department">
                    {member.department}
                  </Badge>
                )}
                <Badge
                  variant={member.role === "admin" ? "default" : "outline"}
                  className="capitalize"
                  data-testid="badge-role"
                >
                  {member.role}
                </Badge>
              </div>
            </div>
          </div>
          <TabsList data-testid="tabs-profile" className="px-4 md:px-6">
            <TabsTrigger value="overview" data-testid="tab-overview">
              Overview
            </TabsTrigger>
            <TabsTrigger value="comments" data-testid="tab-comments">
              Comments
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0">
          <div className="max-w-4xl space-y-6 p-4 md:p-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex flex-col items-center md:items-start">
                    <Avatar className="h-32 w-32">
                      <AvatarImage
                        src={member.profileImageUrl || undefined}
                        alt={fullName}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-3xl font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 space-y-4">
                    {member.bio && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">About</h3>
                        <p className="whitespace-pre-wrap" data-testid="text-bio">
                          {member.bio}
                        </p>
                      </div>
                    )}
                    <div className="space-y-3">
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                          data-testid="link-email"
                        >
                          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{member.email}</span>
                        </a>
                      )}
                      {member.phone && (
                        <a
                          href={`tel:${member.phone}`}
                          className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                          data-testid="link-phone"
                        >
                          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{member.phone}</span>
                        </a>
                      )}
                      {member.location && (
                        <div
                          className="flex items-center gap-3 text-sm text-muted-foreground"
                          data-testid="text-location"
                        >
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span>{member.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comments" className="mt-0">
          <div className="max-w-4xl p-4 md:p-6">
            <CommentList entityType="user" entityId={id || ""} />
          </div>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
