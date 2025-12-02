import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  Calendar,
  Edit,
  ArrowLeft,
} from "lucide-react";
import type { User } from "@shared/schema";

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();

  const { data: employee, isLoading, error } = useQuery<User>({
    queryKey: ["/api/employees", id],
    enabled: !!id,
  });

  const isOwnProfile = currentUser?.id === employee?.id;

  if (isLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Directory", href: "/directory" },
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

  if (error || !employee) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Directory", href: "/directory" },
          { label: "Not Found" },
        ]}
      >
        <div className="p-6 max-w-5xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Employee Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The employee you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => setLocation("/directory")} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Directory
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  const fullName =
    [employee.firstName, employee.lastName].filter(Boolean).join(" ") || "Unknown";
  const initials =
    `${employee.firstName?.[0] || ""}${employee.lastName?.[0] || ""}`.toUpperCase() || "U";

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Directory", href: "/directory" },
        { label: fullName },
      ]}
      actionButton={
        isOwnProfile
          ? {
              label: "Edit Profile",
              icon: Edit,
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
                      src={employee.profileImageUrl || undefined}
                      alt={fullName}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary/10 text-primary text-3xl font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <h1
                    className="text-xl font-semibold mb-1"
                    data-testid="text-employee-name"
                  >
                    {fullName}
                  </h1>
                  {employee.title && (
                    <p
                      className="text-muted-foreground mb-3"
                      data-testid="text-employee-title"
                    >
                      {employee.title}
                    </p>
                  )}
                  <div className="flex flex-wrap justify-center gap-2">
                    {employee.department && (
                      <Badge variant="secondary" data-testid="badge-department">
                        {employee.department}
                      </Badge>
                    )}
                    <Badge
                      variant={employee.role === "admin" ? "default" : "outline"}
                      className="capitalize"
                      data-testid="badge-role"
                    >
                      {employee.role}
                    </Badge>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-border space-y-3">
                  {employee.email && (
                    <a
                      href={`mailto:${employee.email}`}
                      className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                      data-testid="link-email"
                    >
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{employee.email}</span>
                    </a>
                  )}
                  {employee.phone && (
                    <a
                      href={`tel:${employee.phone}`}
                      className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                      data-testid="link-phone"
                    >
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{employee.phone}</span>
                    </a>
                  )}
                  {employee.location && (
                    <div
                      className="flex items-center gap-3 text-sm"
                      data-testid="text-location"
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{employee.location}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            {employee.bio && (
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-lg">About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    className="text-muted-foreground whitespace-pre-wrap"
                    data-testid="text-bio"
                  >
                    {employee.bio}
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
                        {employee.title || "Not specified"}
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
                        {employee.department || "Not specified"}
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
                        {employee.location || "Not specified"}
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
                        {employee.createdAt
                          ? new Date(employee.createdAt).toLocaleDateString("en-US", {
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
