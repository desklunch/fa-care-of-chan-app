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

export default function TeamProfile() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const { data: member, isLoading, error } = useQuery<User>({
    queryKey: ["/api/team", id],
    enabled: !!id,
  });

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
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
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
                          <SelectItem value="employee">Employee</SelectItem>
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

                <div className="mt-6 pt-6 border-t border-border space-y-3">
                  {member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                      data-testid="link-email"
                    >
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{member.email}</span>
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
                      className="flex items-center gap-3 text-sm"
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

          <div className="md:col-span-2 space-y-6">
            {member.bio && (
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-lg">About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    className="text-muted-foreground whitespace-pre-wrap"
                    data-testid="text-bio"
                  >
                    {member.bio}
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
                      <Briefcase className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Title</p>
                      <p className="font-medium" data-testid="text-detail-title">
                        {member.title || "Not specified"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Department</p>
                      <p className="font-medium" data-testid="text-detail-department">
                        {member.department || "Not specified"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium" data-testid="text-detail-location">
                        {member.location || "Not specified"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Joined</p>
                      <p className="font-medium" data-testid="text-detail-joined">
                        {member.createdAt
                          ? new Date(member.createdAt).toLocaleDateString("en-US", {
                              month: "long",
                              year: "numeric",
                            })
                          : "Not available"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
