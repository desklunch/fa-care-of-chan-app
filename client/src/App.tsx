import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LayoutProvider } from "@/framework";
import { useAuth } from "@/hooks/useAuth";
import { Users, UserPlus, Activity } from "lucide-react";
import type { LayoutConfig } from "@/framework/types/layout";

import Landing from "@/pages/landing";
import InviteActivation from "@/pages/invite-activation";
import TeamPage from "@/pages/team";
import TeamProfile from "@/pages/team-profile";
import Profile from "@/pages/profile";
import ProfileEdit from "@/pages/profile-edit";
import AdminInvites from "@/pages/admin-invites";
import AdminLogs from "@/pages/admin-logs";
import NotFound from "@/pages/not-found";

function useLayoutConfig() {
  const { user } = useAuth();

  const layoutConfig: LayoutConfig = {
    user: user
      ? {
          id: user.id,
          username: user.email || "User",
          email: user.email || "",
          fullName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User",
          role: user.role || "employee",
          profileImageUrl: user.profileImageUrl || undefined,
        }
      : null,
    navigation: [
      {
        items: [
          {
            name: "Team",
            href: "/team",
            icon: Users,
          },
        ],
      },
      {
        heading: "Admin",
        allowedRoles: ["admin"],
        items: [
          {
            name: "Invites",
            href: "/admin/invites",
            icon: UserPlus,
            allowedRoles: ["admin"],
          },
          {
            name: "Logs",
            href: "/admin/logs",
            icon: Activity,
            allowedRoles: ["admin"],
          },
        ],
      },
    ],
    onSignOut: () => {
      window.location.href = "/api/logout";
    },
  };

  return layoutConfig;
}

function AuthenticatedRoutes() {
  const layoutConfig = useLayoutConfig();

  return (
    <LayoutProvider config={layoutConfig}>
      <Switch>
        <Route path="/" component={TeamPage} />
        <Route path="/team" component={TeamPage} />
        <Route path="/team/:id" component={TeamProfile} />
        <Route path="/profile" component={Profile} />
        <Route path="/profile/edit" component={ProfileEdit} />
        <Route path="/admin/invites" component={AdminInvites} />
        <Route path="/admin/logs" component={AdminLogs} />
        <Route component={NotFound} />
      </Switch>
    </LayoutProvider>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/invite" component={InviteActivation} />
      {isAuthenticated ? (
        <Route>
          <AuthenticatedRoutes />
        </Route>
      ) : (
        <>
          <Route path="/" component={Landing} />
          <Route component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
