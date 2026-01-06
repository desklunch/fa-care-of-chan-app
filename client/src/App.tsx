import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { GoogleAuthProviderWrapper } from "@/lib/google-auth";
import { LayoutProvider, AppShell } from "@/framework";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { TabVisibilityHandler } from "@/hooks/useTabVisibility";
import type { LayoutConfig } from "@/framework/types/layout";

const Landing = lazy(() => import("@/pages/landing"));
const InviteActivation = lazy(() => import("@/pages/invite-activation"));
const AuthError = lazy(() => import("@/pages/auth-error"));
const TeamPage = lazy(() => import("@/pages/team"));
const TeamProfile = lazy(() => import("@/pages/team-profile"));
const Profile = lazy(() => import("@/pages/profile"));
const ProfileEdit = lazy(() => import("@/pages/profile-edit"));
const AdminInvites = lazy(() => import("@/pages/admin-invites"));
const AdminLogs = lazy(() => import("@/pages/admin-logs"));
const AppFeatures = lazy(() => import("@/pages/app-features"));
const AppFeatureDetail = lazy(() => import("@/pages/app-feature-detail"));
const AppFeatureForm = lazy(() => import("@/pages/app-feature-form"));
const AdminAppFeatures = lazy(() => import("@/pages/admin-app-features"));
const Contacts = lazy(() => import("@/pages/contacts"));
const ContactDetail = lazy(() => import("@/pages/contact-detail"));
const ContactForm = lazy(() => import("@/pages/contact-form"));
const Vendors = lazy(() => import("@/pages/vendors"));
const VendorDetail = lazy(() => import("@/pages/vendor-detail"));
const VendorForm = lazy(() => import("@/pages/vendor-form"));
const Venues = lazy(() => import("@/pages/venues"));
const VenueForm = lazy(() => import("@/pages/venue-form"));
const VenueDetail = lazy(() => import("@/pages/venue-detail"));
const VenueCollections = lazy(() => import("@/pages/venue-collections"));
const VenueCollectionForm = lazy(() => import("@/pages/venue-collection-form"));
const VenueCollectionDetail = lazy(() => import("@/pages/venue-collection-detail"));
const Amenities = lazy(() => import("@/pages/amenities"));
const Industries = lazy(() => import("@/pages/industries"));
const ManageSalesPage = lazy(() => import("@/pages/manage"));
const TagsPage = lazy(() => import("@/pages/tags"));
const ManageVenuesPage = lazy(() => import("@/pages/manage-venues"));
const AdminVendorServices = lazy(() => import("@/pages/admin-vendor-services"));
const AdminThemeEditor = lazy(() => import("@/pages/admin-theme-editor"));
const AdminVendorTokens = lazy(() => import("@/pages/admin-vendor-tokens"));
const VendorUpdateForm = lazy(() => import("@/pages/vendor-update-form"));
const AppIssues = lazy(() => import("@/pages/app-issues"));
const AppIssueForm = lazy(() => import("@/pages/app-issue-form"));
const AppIssueDetail = lazy(() => import("@/pages/app-issue-detail"));
const FormTemplates = lazy(() => import("@/pages/form-templates"));
const FormTemplateForm = lazy(() => import("@/pages/form-template-form"));
const FormTemplateDetail = lazy(() => import("@/pages/form-template-detail"));
const FormRequests = lazy(() => import("@/pages/form-requests"));
const FormRequestForm = lazy(() => import("@/pages/form-request-form"));
const FormRequestDetail = lazy(() => import("@/pages/form-request-detail"));
const PublicForm = lazy(() => import("@/pages/public-form"));
const FormPreview = lazy(() => import("@/pages/form-preview"));
const CommentsPage = lazy(() => import("@/pages/comments"));
const AdminAnalytics = lazy(() => import("@/pages/admin-analytics"));
const AdminReleases = lazy(() => import("@/pages/admin-releases"));
const AdminReleaseDetail = lazy(() => import("@/pages/admin-release-detail"));
const Guide = lazy(() => import("@/pages/guide"));
const Feedback = lazy(() => import("@/pages/feedback"));
const PublicVenueDetail = lazy(() => import("@/pages/public-venue-detail"));
const PublicVenueCollection = lazy(() => import("@/pages/public-venue-collection"));
const Deals = lazy(() => import("@/pages/deals"));
const DealForm = lazy(() => import("@/pages/deal-form"));
const DealDetail = lazy(() => import("@/pages/deal-detail"));
const DealReports = lazy(() => import("@/pages/deal-reports"));
const Clients = lazy(() => import("@/pages/clients"));
const ClientForm = lazy(() => import("@/pages/client-form"));
const ClientDetail = lazy(() => import("@/pages/client-detail"));
const ClientContacts = lazy(() => import("@/pages/client-contacts"));
const Brands = lazy(() => import("@/pages/brands"));
const VendorContacts = lazy(() => import("@/pages/vendor-contacts"));
const EventSchedulePrototype = lazy(() => import("@/pages/event-schedule-prototype"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
}
import {
  CircleUserRound,
  UserPlus,
  SquareTerminal,
  DraftingCompass,
  Sparkles,
  BookOpenCheck,
  Bug,
  Contact,
  Store,
  Briefcase,
  Palette,
  Link2,
  FileText,
  RadioTower,
  Handshake,
  Tag,
  Tags,
  FolderOpen,
  MessageSquare,
  MessageCircleQuestion,
  ScanEye,
  BookOpen,
  Users,
  Rocket,
  Tickets,
  Building2,
  SlidersHorizontal,
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
        heading: "Venues",
        items: [
          {
            name: "Venues",
            href: "/venues",
            icon: Store,
          },
          {
            name: "Collections",
            href: "/venues/collections",
            icon: FolderOpen,
          },
          {
            name: "Manage",
            href: "/manage/venues",
            icon: SlidersHorizontal,
          },
        ],
      },
      {
        heading: "New Business",
        allowedRoles: ["admin", "manager"],
        items: [
          {
            name: "Deals",
            href: "/deals",
            icon: Tickets,
          },
          {
            name: "Views",
            href: "/deals/reports",
            icon: ScanEye,
          },
          {
            name: "Clients",
            href: "/clients",
            icon: Building2,
          },

          {
            name: "Contacts",
            href: "/contacts",
            icon: Contact,
          },
          {
            name: "Manage",
            href: "/sales/manage",
            icon: SlidersHorizontal,
          },
        ],
      },
      {
        heading: "Support",
        items: [
          {
            name: "Guide",
            href: "/guide",
            icon: BookOpen,
          },
          {
            name: "Feedback",
            href: "/app/feedback",
            icon: MessageCircleQuestion,
          },
        ],
      },
      {
        heading: "Admin",
        allowedRoles: ["admin", "manager"],
        defaultCollapsed: true,
        items: [
          {
            name: "Team",
            href: "/team",
            icon: Users,
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
          {
            name: "Logs",
            href: "/admin/logs",
            icon: SquareTerminal,
          },
          {
            name: "Analytics",
            href: "/admin/analytics",
            icon: ScanEye,
          },
        ],
      },
      {
        heading: "In Development",
        allowedRoles: ["admin"],
        defaultCollapsed: true,
        items: [
          {
            name: "Theme Editor",
            href: "/admin/theme",
            icon: Palette,
          },
          {
            name: "Vendors",
            href: "/vendors",
            icon: Handshake,
          },
          {
            name: "Requests",
            href: "/forms/requests",
            icon: RadioTower,
          },
          {
            name: "Forms",
            href: "/forms/templates",
            icon: FileText,
          },
          {
            name: "Comments",
            href: "/comments",
            icon: MessageSquare,
          },
          {
            name: "Invites",
            href: "/admin/invites",
            icon: UserPlus,
          },
          {
            name: "Feature Categories",
            href: "/admin/app/features",
            icon: Tags,
          },
          {
            name: "Vendor Services",
            href: "/admin/vendors/services",
            icon: Briefcase,
          },
          {
            name: "Vendor Tokens",
            href: "/admin/vendors/tokens",
            icon: Link2,
          },

        ],
      },
      {
        heading: "App",
        allowedRoles: ["admin"],
        defaultCollapsed: true,
        items: [
          {
            name: "Feature Categories",
            href: "/admin/app/features",
            icon: Tags,
          },
          {
            name: "Releases",
            href: "/admin/releases",
            icon: Rocket,
          },
        ],
      },
    ],
    onSignOut: async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
        queryClient.clear();
        window.location.href = "/";
      } catch (error) {
        console.error("Logout error:", error);
        window.location.href = "/";
      }
    },
  };

  return layoutConfig;
}

function AuthenticatedRoutes() {
  const layoutConfig = useLayoutConfig();

  return (
    <LayoutProvider config={layoutConfig}>
      <AppShell>
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/" component={Venues} />
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
          <Route path="/venues" component={Venues} />
          <Route path="/venues/new" component={VenueForm} />
          <Route path="/venues/collections" component={VenueCollections} />
          <Route path="/venues/collections/new" component={VenueCollectionForm} />
          <Route path="/venues/collections/:id/edit" component={VenueCollectionForm} />
          <Route path="/venues/collections/:id" component={VenueCollectionDetail} />
          <Route path="/venues/:id/edit" component={VenueForm} />
          <Route path="/venues/:id" component={VenueDetail} />
          <Route path="/comments" component={CommentsPage} />
          <Route path="/manage/venues" component={ManageVenuesPage} />
          <Route path="/amenities" component={Amenities} />
          <Route path="/industries" component={Industries} />
          <Route path="/sales/manage" component={ManageSalesPage} />
          <Route path="/tags" component={TagsPage} />
          <Route path="/deals" component={Deals} />
          <Route path="/deals/reports" component={DealReports} />
          <Route path="/deals/new" component={DealForm} />
          <Route path="/deals/:id/edit" component={DealForm} />
          <Route path="/deals/:id" component={DealDetail} />
          <Route path="/clients" component={Clients} />
          <Route path="/clients/contacts" component={ClientContacts} />
          <Route path="/clients/new" component={ClientForm} />
          <Route path="/clients/:id/edit" component={ClientForm} />
          <Route path="/clients/:id" component={ClientDetail} />
          <Route path="/brands" component={Brands} />
          <Route path="/vendors/contacts" component={VendorContacts} />
          <Route path="/prototype/event-schedule" component={EventSchedulePrototype} />
          <Route path="/admin/invites" component={AdminInvites} />
          <Route path="/admin/app/features" component={AdminAppFeatures} />
          <Route path="/admin/vendors/services" component={AdminVendorServices} />
          <Route path="/admin/vendors/tokens" component={AdminVendorTokens} />
          <Route path="/forms/templates" component={FormTemplates} />
          <Route path="/forms/templates/new" component={FormTemplateForm} />
          <Route path="/forms/templates/:id/edit" component={FormTemplateForm} />
          <Route path="/forms/templates/:id" component={FormTemplateDetail} />
          <Route path="/forms/requests" component={FormRequests} />
          <Route path="/forms/requests/new" component={FormRequestForm} />
          <Route path="/forms/requests/:id/edit" component={FormRequestForm} />
          <Route path="/forms/requests/:id" component={FormRequestDetail} />
          <Route path="/admin/theme" component={AdminThemeEditor} />
          <Route path="/admin/logs" component={AdminLogs} />
          <Route path="/admin/analytics" component={AdminAnalytics} />
          <Route path="/admin/releases" component={AdminReleases} />
          <Route path="/admin/releases/:id" component={AdminReleaseDetail} />
          <Route path="/guide" component={Guide} />
          <Route path="/app/feedback" component={Feedback} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </AppShell>
    </LayoutProvider>
  );
}

function AnalyticsTracker() {
  useAnalytics();
  return null;
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
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/invite" component={InviteActivation} />
        <Route path="/auth-error" component={AuthError} />
        <Route path="/vendor-update/:token" component={VendorUpdateForm} />
        <Route path="/form/:token" component={PublicForm} />
        <Route path="/form/preview/:requestId" component={FormPreview} />
        <Route path="/public/venues/:id" component={PublicVenueDetail} />
        <Route path="/public/venues/collections/:id" component={PublicVenueCollection} />
        {isAuthenticated ? (
          <Route>
            <AuthenticatedRoutes />
          </Route>
        ) : (
          <>
            <Route path="/venues/:id">
              {(params) => {
                window.location.replace(`/public/venues/${params.id}`);
                return null;
              }}
            </Route>
            <Route path="/venues/collections/:id">
              {(params) => {
                window.location.replace(`/public/venues/collections/${params.id}`);
                return null;
              }}
            </Route>
            <Route path="/" component={Landing} />
            <Route component={NotFound} />
          </>
        )}
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GoogleAuthProviderWrapper>
        <ThemeProvider defaultTheme="system" storageKey="app-theme">
          <TooltipProvider>
            <AnalyticsTracker />
            <TabVisibilityHandler />
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </GoogleAuthProviderWrapper>
    </QueryClientProvider>
  );
}

export default App;
