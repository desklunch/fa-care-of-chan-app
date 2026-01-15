import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Loader2, Save, Shield } from "lucide-react";
import { updateProfileSchema, type UpdateProfile, type User } from "@shared/schema";
import { PermissionGate } from "@/components/permission-gate";
import { NoPermissionMessage } from "@/components/no-permission-message";

export default function TeamEdit() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);

  const isAdmin = can('team.manage');

  const { data: member, isLoading: memberLoading } = useQuery<User>({
    queryKey: ["/api/team", id],
    enabled: !!id,
  });

  usePageTitle(member ? `Edit ${member.firstName} ${member.lastName}` : "Edit Team Member");

  const form = useForm<UpdateProfile>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      title: "",
      department: "",
      phone: "",
      location: "",
      bio: "",
      profileImageUrl: "",
    },
  });

  useEffect(() => {
    if (member) {
      form.reset({
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        title: member.title || "",
        department: member.department || "",
        phone: member.phone || "",
        location: member.location || "",
        bio: member.bio || "",
        profileImageUrl: member.profileImageUrl || "",
      });
      setSelectedRole(member.role || "employee");
      setIsActive(member.isActive ?? true);
    }
  }, [member, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateProfile & { role?: string; isActive?: boolean }) => {
      return apiRequest("PATCH", `/api/team/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team", id] });
      toast({
        title: "Profile Updated",
        description: "Team member profile has been successfully updated.",
      });
      setLocation(`/team/${id}`);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You don't have permission to edit this profile.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateProfile) => {
    updateMutation.mutate({ ...data, role: selectedRole, isActive });
  };

  if (memberLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Team", href: "/team" }, { label: "Loading..." }]}>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  if (!member) {
    return (
      <PageLayout breadcrumbs={[{ label: "Team", href: "/team" }, { label: "Not Found" }]}>
        <div className="p-6 text-center text-muted-foreground">
          Team member not found.
        </div>
      </PageLayout>
    );
  }

  const fullName =
    [member.firstName, member.lastName].filter(Boolean).join(" ") || "Unknown";
  const initials =
    `${member.firstName?.[0] || ""}${member.lastName?.[0] || ""}`.toUpperCase() || "U";

  return (
    <PermissionGate permission="team.manage" behavior="fallback" fallback={<NoPermissionMessage />}>
      <PageLayout
        breadcrumbs={[
          { label: "Team", href: "/team" },
          { label: fullName, href: `/team/${id}` },
          { label: "Edit" },
        ]}
      >
        <div className="p-4 md:p-6 max-w-3xl mx-auto">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle>Edit Team Member</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="flex items-center gap-4 pb-6 border-b border-border">
                    <Avatar className="h-20 w-20">
                      <AvatarImage
                        src={form.watch("profileImageUrl") || member.profileImageUrl || undefined}
                        alt={fullName}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name="profileImageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Profile Image URL</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://example.com/avatar.jpg"
                                {...field}
                                value={field.value || ""}
                                data-testid="input-profile-image"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-first-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Doe"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-last-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Software Engineer"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-title"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Engineering"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-department"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+1 (555) 123-4567"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="San Francisco, CA"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-location"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about this team member..."
                            className="min-h-[120px] resize-none"
                            {...field}
                            value={field.value || ""}
                            data-testid="textarea-bio"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4 border-t border-border space-y-4">
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Role
                      </FormLabel>
                      <Select
                        value={selectedRole}
                        onValueChange={setSelectedRole}
                      >
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Controls what this user can access in the application.
                      </p>
                    </FormItem>

                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Inactive users cannot log in to the application.
                        </p>
                      </div>
                      <Switch
                        checked={isActive}
                        onCheckedChange={setIsActive}
                        data-testid="switch-is-active"
                      />
                    </FormItem>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setLocation(`/team/${id}`)}
                      disabled={updateMutation.isPending}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                      data-testid="button-save"
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    </PermissionGate>
  );
}
