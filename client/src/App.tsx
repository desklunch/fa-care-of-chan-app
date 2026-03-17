import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { GoogleAuthProviderWrapper } from "@/lib/google-auth";
import { TierOverrideProvider } from "@/contexts/tier-override-context";
import { LayoutProvider, AppShell } from "@/framework";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { NavigationWatchdog } from "@/hooks/useNavigationWatchdog";
import { NavigationLogger } from "@/hooks/useNavigationLogger";
import { InputLogger } from "@/hooks/useInputLogger";
import type { LayoutConfig } from "@/framework/types/layout";

import "@/lib/debug-logger";

const Landing = lazy(() => import("@/pages/landing"));
const AuthError = lazy(() => import("@/pages/auth-error"));
const TeamPage = lazy(() => import("@/pages/team"));
const TeamProfile = lazy(() => import("@/pages/team-profile"));
const TeamEdit = lazy(() => import("@/pages/team-edit"));
const Profile = lazy(() => import("@/pages/profile"));
const ProfileEdit = lazy(() => import("@/pages/profile-edit"));
const AdminLogs = lazy(() => import("@/pages/admin-logs"));
const AdminAppFeatures = lazy(() => import("@/pages/admin-app-features"));
const AppFeatures = lazy(() => import("@/pages/app-features"));
const AppFeatureDetail = lazy(() => import("@/pages/app-feature-detail"));
const AppFeatureForm = lazy(() => import("@/pages/app-feature-form"));
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
const VenueCollectionDetail = lazy(
  () => import("@/pages/venue-collection-detail"),
);
const Amenities = lazy(() => import("@/pages/amenities"));
const Industries = lazy(() => import("@/pages/industries"));
const ManageTagsPage = lazy(() => import("@/pages/manage-tags"));
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
const PublicVenueCollection = lazy(
  () => import("@/pages/public-venue-collection"),
);
const Deals = lazy(() => import("@/pages/deals"));
const DealsSandbox = lazy(() => import("@/pages/deals-sandbox"));
const DealForm = lazy(() => import("@/pages/deal-form"));
const DealDetail = lazy(() => import("@/pages/deal-detail"));
const DealReports = lazy(() => import("@/pages/deal-reports"));
const DealForecast = lazy(() => import("@/pages/deal-forecast"));
const PipelineHealth = lazy(() => import("@/pages/pipeline-health"));
const Clients = lazy(() => import("@/pages/clients"));
const ClientForm = lazy(() => import("@/pages/client-form"));
const ClientDetail = lazy(() => import("@/pages/client-detail"));
const ClientContacts = lazy(() => import("@/pages/client-contacts"));
const Brands = lazy(() => import("@/pages/brands"));
const VendorContacts = lazy(() => import("@/pages/vendor-contacts"));
const EventSchedulePrototype = lazy(
  () => import("@/pages/event-schedule-prototype"),
);
const AIContext = lazy(() => import("@/pages/ai-context"));
const NotFound = lazy(() => import("@/pages/not-found"));
import { AiChatFab } from "@/components/ai-chat/ai-chat-modal";

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
}
import { storeReturnUrl } from "@/lib/return-url";

import {
  CircleUserRound,
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
  Bot,
  TrendingUp,
  Activity,
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
        heading: "Sales",
        defaultCollapsed: true,

        requiredPermission: "deals.read",
        items: [
          {
            name: "Deals",
            href: "/deals",
            icon: Tickets,
            requiredPermission: "deals.read",
          },
          {
            name: "Pipeline",
            href: "/deals/pipeline",
            icon: Activity,
            allowedRoles: ["admin"],
          },
          {
            name: "Views",
            href: "/deals/reports",
            icon: ScanEye,
            requiredPermission: "deals.read",
          },
          {
            name: "Forecast",
            href: "/deals/forecast",
            icon: TrendingUp,
            requiredPermission: "admin.settings",
          },
        ],
      },

      {
        heading: "Venues",
        defaultCollapsed: true,

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
        ],
      },

      {
        heading: "Contacts",
        defaultCollapsed: true,

        items: [
          {
            name: "Clients",
            href: "/clients",
            icon: Building2,
          },
          {
            name: "Vendors",
            href: "/vendors",
            icon: Handshake,
          },
          {
            name: "People",
            href: "/contacts",
            icon: Contact,
          },
        ],
      },
      {
        heading: "Manage",
        defaultCollapsed: true,
        items: [
          {
            name: "Team",
            href: "/team",
            icon: Users,
            requiredPermission: "team.read",
          },
          {
            name: "Tags",
            href: "/manage/tags",
            icon: Tags,
            requiredPermission: "venues.write",
          },
          {
            name: "Theme",
            href: "/admin/theme",
            icon: Palette,
            requiredPermission: "theme.manage",
          },
        ],
      },
      {
        heading: "App",
        defaultCollapsed: true,
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
          {
            name: "AI",
            href: "/ai/context",
            icon: Bot,
            requiredPermission: "admin.settings",
          },

          {
            name: "Features",
            href: "/app/features",
            icon: DraftingCompass,
            requiredPermission: "app_features.read",
          },

          {
            name: "Releases",
            href: "/admin/releases",
            icon: Rocket,
            requiredPermission: "releases.manage",
          },
          {
            name: "Issues",
            href: "/app/issues",
            icon: Bug,
            requiredPermission: "app_features.read",
          },
          {
            name: "Logs",
            href: "/app/logs",
            icon: SquareTerminal,
            requiredPermission: "audit.read",
          },
          {
            name: "Analytics",
            href: "/app/analytics",
            icon: ScanEye,
            requiredPermission: "admin.analytics",
          },
        ],
      },

      {
        heading: "Developer",
        requiredPermission: "admin.settings",
        defaultCollapsed: true,
        items: [
          {
            name: "Feature Categories",
            href: "/admin/app/features",
            icon: Tags,
            requiredPermission: "app_features.manage",
          },

          {
            name: "Requests",
            href: "/forms/requests",
            icon: RadioTower,
            requiredPermission: "admin.settings",
          },
          {
            name: "Forms",
            href: "/forms/templates",
            icon: FileText,
            requiredPermission: "admin.settings",
          },
          {
            name: "Comments",
            href: "/comments",
            icon: MessageSquare,
            requiredPermission: "admin.settings",
          },

          {
            name: "Vendor Tokens",
            href: "/admin/vendors/tokens",
            icon: Link2,
            requiredPermission: "vendor_tokens.manage",
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
  const { user } = useAuth();
  const showAiChat = user?.role === "admin" || user?.role === "manager";

  return (
    <LayoutProvider config={layoutConfig}>
      <AppShell>
        {showAiChat && <AiChatFab />}
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/" component={Venues} />
            <Route path="/admin/features" component={AdminAppFeatures} />
            <Route path="/admin/releases" component={AdminReleases} />
            <Route path="/admin/releases/:id" component={AdminReleaseDetail} />
            <Route path="/admin/theme" component={AdminThemeEditor} />
            <Route path="/admin/vendors/tokens" component={AdminVendorTokens} />
            <Route path="/ai/context" component={AIContext} />
            <Route path="/amenities" component={Amenities} />
            <Route path="/app/analytics" component={AdminAnalytics} />
            <Route path="/app/features" component={AppFeatures} />
            <Route path="/app/features/new" component={AppFeatureForm} />
            <Route path="/app/features/:id" component={AppFeatureDetail} />
            <Route path="/app/features/:id/edit" component={AppFeatureForm} />
            <Route path="/app/feedback" component={Feedback} />
            <Route path="/app/issues" component={AppIssues} />
            <Route path="/app/issues/new" component={AppIssueForm} />
            <Route path="/app/issues/:id" component={AppIssueDetail} />
            <Route path="/app/issues/:id/edit" component={AppIssueForm} />
            <Route path="/app/logs" component={AdminLogs} />
            <Route path="/brands" component={Brands} />
            <Route path="/clients" component={Clients} />
            <Route path="/clients/contacts" component={ClientContacts} />
            <Route path="/clients/new" component={ClientForm} />
            <Route path="/clients/:id" component={ClientDetail} />
            <Route path="/clients/:id/edit" component={ClientForm} />
            <Route path="/comments" component={CommentsPage} />
            <Route path="/contacts" component={Contacts} />
            <Route path="/contacts/new" component={ContactForm} />
            <Route path="/contacts/:id" component={ContactDetail} />
            <Route path="/contacts/:id/edit" component={ContactForm} />
            <Route path="/deals" component={Deals} />
            <Route path="/deals-sandbox" component={DealsSandbox} />
            <Route path="/deals/new" component={DealForm} />
            <Route path="/deals/forecast" component={DealForecast} />
            <Route path="/deals/pipeline" component={PipelineHealth} />
            <Route path="/deals/reports" component={DealReports} />
            <Route path="/deals/:id" component={DealDetail} />
            <Route path="/deals/:id/edit" component={DealForm} />
            <Route path="/forms/requests" component={FormRequests} />
            <Route path="/forms/requests/new" component={FormRequestForm} />
            <Route path="/forms/requests/:id" component={FormRequestDetail} />
            <Route path="/forms/requests/:id/edit" component={FormRequestForm} />
            <Route path="/forms/templates" component={FormTemplates} />
            <Route path="/forms/templates/new" component={FormTemplateForm} />
            <Route path="/forms/templates/:id" component={FormTemplateDetail} />
            <Route path="/forms/templates/:id/edit" component={FormTemplateForm} />
            <Route path="/guide" component={Guide} />
            <Route path="/industries" component={Industries} />
            <Route path="/manage/tags" component={ManageTagsPage} />
            <Route path="/profile" component={Profile} />
            <Route path="/profile/edit" component={ProfileEdit} />
            <Route path="/team" component={TeamPage} />
            <Route path="/team/:id" component={TeamProfile} />
            <Route path="/team/:id/edit" component={TeamEdit} />
            <Route path="/vendors" component={Vendors} />
            <Route path="/vendors/contacts" component={VendorContacts} />
            <Route path="/vendors/new" component={VendorForm} />
            <Route path="/vendors/:id" component={VendorDetail} />
            <Route path="/vendors/:id/edit" component={VendorForm} />
            <Route path="/venues" component={Venues} />
            <Route path="/venues/collections" component={VenueCollections} />
            <Route path="/venues/collections/new" component={VenueCollectionForm} />
            <Route path="/venues/collections/:id" component={VenueCollectionDetail} />
            <Route path="/venues/collections/:id/edit" component={VenueCollectionForm} />
            <Route path="/venues/new" component={VenueForm} />
            <Route path="/venues/:id" component={VenueDetail} />
            <Route path="/venues/:id/edit" component={VenueForm} />
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

function RouterContent() {
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
        <Route path="/auth-error" component={AuthError} />
        <Route path="/vendor-update/:token" component={VendorUpdateForm} />
        <Route path="/form/:token" component={PublicForm} />
        <Route path="/form/preview/:requestId" component={FormPreview} />
        <Route path="/public/venues/:id" component={PublicVenueDetail} />
        <Route
          path="/public/venues/collections/:id"
          component={PublicVenueCollection}
        />
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
                window.location.replace(
                  `/public/venues/collections/${params.id}`,
                );
                return null;
              }}
            </Route>
            <Route path="/" component={Landing} />
            <Route>
              {() => {
                const currentPath =
                  window.location.pathname + window.location.search;
                storeReturnUrl(currentPath);
                return <Landing />;
              }}
            </Route>
          </>
        )}
      </Switch>
    </Suspense>
  );
}

function Router() {
  return <RouterContent />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GoogleAuthProviderWrapper>
        <ThemeProvider defaultTheme="system" storageKey="app-theme">
          <TierOverrideProvider>
            <TooltipProvider>
              <AnalyticsTracker />
              <NavigationWatchdog />
              <NavigationLogger />
              <InputLogger />
              <Toaster />
              <Router />
            </TooltipProvider>
          </TierOverrideProvider>
        </ThemeProvider>
      </GoogleAuthProviderWrapper>
    </QueryClientProvider>
  );
}

export default App;
