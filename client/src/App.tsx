import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { LayoutProvider } from "@/framework";
import { useAuth } from "@/hooks/useAuth";
import type { LayoutConfig } from "@/framework/types/layout";
import Landing from "@/pages/landing";
import InviteActivation from "@/pages/invite-activation";
import TeamPage from "@/pages/team";
import TeamProfile from "@/pages/team-profile";
import Profile from "@/pages/profile";
import ProfileEdit from "@/pages/profile-edit";
import AdminInvites from "@/pages/admin-invites";
import AdminLogs from "@/pages/admin-logs";
import AppFeatures from "@/pages/app-features";
import AppFeatureDetail from "@/pages/app-feature-detail";
import AppFeatureForm from "@/pages/app-feature-form";
import AdminAppFeatures from "@/pages/admin-app-features";
import Contacts from "@/pages/contacts";
import ContactDetail from "@/pages/contact-detail";
import ContactForm from "@/pages/contact-form";
import Vendors from "@/pages/vendors";
import VendorDetail from "@/pages/vendor-detail";
import VendorForm from "@/pages/vendor-form";
import AdminVendorServices from "@/pages/admin-vendor-services";
import AppFeatureRoadmap from "@/pages/app-feature-roadmap";
import AdminThemeEditor from "@/pages/admin-theme-editor";
import AdminVendorTokens from "@/pages/admin-vendor-tokens";
import VendorUpdateForm from "@/pages/vendor-update-form";
import AppIssues from "@/pages/app-issues";
import AppIssueForm from "@/pages/app-issue-form";
import AppIssueDetail from "@/pages/app-issue-detail";
import AdminFormTemplates from "@/pages/admin-form-templates";
import AdminFormTemplateForm from "@/pages/admin-form-template-form";
import AdminFormRequests from "@/pages/admin-form-requests";
import AdminFormRequestForm from "@/pages/admin-form-request-form";
import AdminFormRequestDetail from "@/pages/admin-form-request-detail";
import PublicForm from "@/pages/public-form";
import FormPreview from "@/pages/form-preview";
import NotFound from "@/pages/not-found";
import {
  Users,
  UserPlus,
  SquareTerminal,
  DraftingCompass,
  Tags,
  BookOpenCheck,
  Bug,
  Contact,
  Store,
  Briefcase,
  Map,
  Palette,
  Link2,
  FileText,
  Send,
} from "lucide-react";

function useLayoutConfig() {
  const { user } = useAuth();

  const layoutConfig: LayoutConfig = {
    user: user
      ? {
          id: user.id,
          username: user.email || "User",
          email: user.email || "",
          fullName:
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            user.email ||
            "User",
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
          {
            name: "Contacts",
            href: "/contacts",
            icon: Contact,
          },
          {
            name: "Vendors",
            href: "/vendors",
            icon: Store,
          },
        ],
      },
      {
        heading: "App",
        allowedRoles: ["admin"],
        items: [
          {
            name: "Guide",
            href: "/help",
            icon: BookOpenCheck,
            active: false,
          },
          {
            name: "Features",
            href: "/app/features",
            icon: DraftingCompass,
          },
          {
            name: "Issues",
            href: "/app/issues",
            icon: Bug,
          },
        ],
      },
      {
        heading: "Admin",
        allowedRoles: ["admin"],
        items: [
          {
            name: "Feature Roadmap",
            href: "/admin/app/roadmap",
            icon: Map,
            allowedRoles: ["admin"],
          },
          {
            name: "Invites",
            href: "/admin/invites",
            icon: UserPlus,
            allowedRoles: ["admin"],
          },
          {
            name: "Feature Categories",
            href: "/admin/app/features",
            icon: Tags,
            allowedRoles: ["admin"],
          },
          {
            name: "Vendor Services",
            href: "/admin/vendors/services",
            icon: Briefcase,
            allowedRoles: ["admin"],
          },
          {
            name: "Vendor Tokens",
            href: "/admin/vendors/tokens",
            icon: Link2,
            allowedRoles: ["admin"],
          },
          {
            name: "Form Templates",
            href: "/admin/forms/templates",
            icon: FileText,
            allowedRoles: ["admin"],
          },
          {
            name: "Form Requests",
            href: "/admin/forms/requests",
            icon: Send,
            allowedRoles: ["admin"],
          },
          {
            name: "Theme Editor",
            href: "/admin/theme",
            icon: Palette,
            allowedRoles: ["admin"],
          },
          {
            name: "Logs",
            href: "/admin/logs",
            icon: SquareTerminal,
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
        <Route path="/app/features" component={AppFeatures} />
        <Route path="/app/features/new" component={AppFeatureForm} />
        <Route path="/app/features/:id/edit" component={AppFeatureForm} />
        <Route path="/app/features/:id" component={AppFeatureDetail} />
        <Route path="/app/issues" component={AppIssues} />
        <Route path="/app/issues/new" component={AppIssueForm} />
        <Route path="/app/issues/:id/edit" component={AppIssueForm} />
        <Route path="/app/issues/:id" component={AppIssueDetail} />
        <Route path="/contacts" component={Contacts} />
        <Route path="/contacts/new" component={ContactForm} />
        <Route path="/contacts/:id/edit" component={ContactForm} />
        <Route path="/contacts/:id" component={ContactDetail} />
        <Route path="/vendors" component={Vendors} />
        <Route path="/vendors/new" component={VendorForm} />
        <Route path="/vendors/:id/edit" component={VendorForm} />
        <Route path="/vendors/:id" component={VendorDetail} />
        <Route path="/admin/invites" component={AdminInvites} />
        <Route path="/admin/app/features" component={AdminAppFeatures} />
        <Route path="/admin/app/roadmap" component={AppFeatureRoadmap} />
        <Route path="/admin/vendors/services" component={AdminVendorServices} />
        <Route path="/admin/vendors/tokens" component={AdminVendorTokens} />
        <Route path="/admin/forms/templates" component={AdminFormTemplates} />
        <Route path="/admin/forms/templates/new" component={AdminFormTemplateForm} />
        <Route path="/admin/forms/templates/:id/edit" component={AdminFormTemplateForm} />
        <Route path="/admin/forms/requests" component={AdminFormRequests} />
        <Route path="/admin/forms/requests/new" component={AdminFormRequestForm} />
        <Route path="/admin/forms/requests/:id/edit" component={AdminFormRequestForm} />
        <Route path="/admin/forms/requests/:id" component={AdminFormRequestDetail} />
        <Route path="/admin/theme" component={AdminThemeEditor} />
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
      <Route path="/vendor-update/:token" component={VendorUpdateForm} />
      <Route path="/form/:token" component={PublicForm} />
      <Route path="/form/preview/:requestId" component={FormPreview} />
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
      <ThemeProvider defaultTheme="system" storageKey="app-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
