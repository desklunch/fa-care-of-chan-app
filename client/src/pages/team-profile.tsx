import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldRow } from "@/components/inline-edit";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Building2,
  SquarePen,
  ArrowLeft,
} from "lucide-react";
import type { User } from "@shared/schema";
import { usePageTitle } from "@/hooks/use-page-title";

export default function TeamProfile() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useProtectedLocation();
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
      <div className="p-4 md:p-6 pb-2 md:pb-2">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage
              src={member.profileImageUrl || undefined}
              alt={fullName}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-3xl font-bold" data-testid="text-member-name">
            {fullName}
          </h1>
        </div>
      </div>

      <div className="max-w-4xl space-y-6 p-4 md:p-6">
        <Card>
          <CardContent className="p-6">
            <div>
                <FieldRow label="First Name" testId="field-first-name">
                  {member.firstName || <span className="text-muted-foreground">Not set</span>}
                </FieldRow>
                <FieldRow label="Last Name" testId="field-last-name">
                  {member.lastName || <span className="text-muted-foreground">Not set</span>}
                </FieldRow>
                <FieldRow label="Email" testId="field-email">
                  {member.email ? (
                    <a
                      href={`mailto:${member.email}`}
                      className="hover:text-primary transition-colors"
                    >
                      {member.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </FieldRow>
                <FieldRow label="Phone" testId="field-phone">
                  {member.phone ? (
                    <a
                      href={`tel:${member.phone}`}
                      className="hover:text-primary transition-colors"
                    >
                      {member.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </FieldRow>
                <FieldRow label="Title" testId="field-title">
                  {member.title || <span className="text-muted-foreground">Not set</span>}
                </FieldRow>
                <FieldRow label="Department" testId="field-department">
                  {member.department || <span className="text-muted-foreground">Not set</span>}
                </FieldRow>
                <FieldRow label="Location" testId="field-location">
                  {member.location || <span className="text-muted-foreground">Not set</span>}
                </FieldRow>
                <FieldRow label="Role" testId="field-role">
                  <span className="capitalize">{member.role}</span>
                </FieldRow>
                <FieldRow label="Status" testId="field-status">
                  <Badge variant={member.isActive ? "default" : "secondary"}>
                    {member.isActive ? "Active" : "Inactive"}
                  </Badge>
                </FieldRow>
                <FieldRow label="Bio" testId="field-bio">
                  {member.bio ? (
                    <p className="whitespace-pre-wrap">{member.bio}</p>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </FieldRow>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
