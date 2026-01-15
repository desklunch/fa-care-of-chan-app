import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  Calendar,
  SquarePen,
  ArrowLeft,
  Shield,
} from "lucide-react";
import type { User } from "@shared/schema";
import { usePageTitle } from "@/hooks/use-page-title";

export default function TeamProfile() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const { data: member, isLoading, error } = useQuery<User>({
    queryKey: ["/api/team", id],
    enabled: !!id,
  });

  usePageTitle(member ? `${member.firstName} ${member.lastName}` : "Team Member");

  const updateRoleMutation = useMutation({
    mutationFn: async (newRole: string) => {
      return apiRequest("PATCH", `/api/team/${id}/role`, { role: newRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team", id] });
      toast({ title: "Role updated", description: "User role has been changed successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const isOwnProfile = currentUser?.id === member?.id;
  const isAdmin = currentUser?.role === "admin";
  const canChangeRole = isAdmin && !isOwnProfile;

  if (isLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Team", href: "/team" },
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
                    <Skeleton className="h-6 w-24" />
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

  if (error || !member) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Team", href: "/team" },
          { label: "Not Found" },
        ]}
      >
        <div className="p-6 max-w-5xl mx-auto">
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

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Team", href: "/team" },
        { label: fullName },
      ]}
      primaryAction={
        isOwnProfile
          ? {
              label: "Edit Profile",
              icon: SquarePen,
              href: "/profile/edit",
            }
          : undefined
      }
    >
      <div className="p-4 md:p-6 max-w-lg mx-auto">
        <div className="gap-6">
          <div className="md:col-span-1">
            <Card className="border-card-border">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-32 w-32 mb-4">
                    <AvatarImage
                      src={member.profileImageUrl || undefined}
                      alt={fullName}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary/10 text-primary text-3xl font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <h1
                    className="text-xl font-semibold mb-1"
                    data-testid="text-member-name"
                  >
                    {fullName}
                  </h1>
                  {member.title && (
                    <p
                      className="text-muted-foreground mb-3"
                      data-testid="text-member-title"
                    >
                      {member.title}
                    </p>
                  )}
                  <div className="flex flex-wrap justify-center gap-2">
                    {member.department && (
                      <Badge variant="secondary" data-testid="badge-department">
                        {member.department}
                      </Badge>
                    )}
                    {canChangeRole ? (
                      <Select
                        value={member.role}
                        onValueChange={(value) => updateRoleMutation.mutate(value)}
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger 
                          className="h-6 w-auto gap-1 px-2 text-xs"
                          data-testid="select-role"
                        >
                          <Shield className="h-3 w-3" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant={member.role === "admin" ? "default" : "outline"}
                        className="capitalize"
                        data-testid="badge-role"
                      >
                        {member.role}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className=" flex flex-col items-center  gap-2 mt-6 pt-6 border-t border-border space-y-3">
                  {member.bio && (
      <p
        className="whitespace-pre-wrap text-center"
        data-testid="text-bio"
      >
        {member.bio}
      </p>
                  )}
                  {member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="flex items-center gap-3 text-sm hover:text-primary transition-colors text-muted-foreground"
                      data-testid="link-email"
                    >
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </a>
                  )}
                  {member.phone && (
                    <a
                      href={`tel:${member.phone}`}
                      className="flex items-center gap-3 text-sm hover:text-primary transition-colors text-muted-foreground" 
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
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{member.location}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </PageLayout>
  );
}
