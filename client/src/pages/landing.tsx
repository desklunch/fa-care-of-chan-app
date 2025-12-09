import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Shield, Loader2, Bug } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const isDevelopment = import.meta.env.DEV;

export default function Landing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (credential: string) => {
      const res = await apiRequest("POST", "/api/auth/google", { credential });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    },
    onError: (error: any) => {
      if (error.message?.includes("domain")) {
        setLocation("/auth-error?reason=domain");
      } else {
        toast({
          title: "Sign in failed",
          description: error.message || "Please try again",
          variant: "destructive",
        });
      }
    },
  });

  const devLoginMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/auth/dev-login", { email });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Dev login failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      <div className="container mx-auto px-4 py-8">
        <nav className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="font-semibold text-xl tracking-tight">Care of Chan OS</span>
          </div>
          <div data-testid="button-sign-in">
            {loginMutation.isPending ? (
              <Button disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </Button>
            ) : (
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  if (credentialResponse.credential) {
                    loginMutation.mutate(credentialResponse.credential);
                  }
                }}
                onError={() => {
                  toast({
                    title: "Sign in failed",
                    description: "Google sign-in was cancelled or failed",
                    variant: "destructive",
                  });
                }}
                theme="outline"
                size="large"
                text="signin_with"
              />
            )}
          </div>
        </nav>

        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Care of Chan OS
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            A centralized platform for managing your organization's venues, vendors, and team. 
            Connect with colleagues, access contact details, and maintain accurate records.
          </p>
          <div className="flex justify-center" data-testid="button-get-started">
            {loginMutation.isPending ? (
              <Button size="lg" className="h-12 px-8" disabled>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </Button>
            ) : (
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  if (credentialResponse.credential) {
                    loginMutation.mutate(credentialResponse.credential);
                  }
                }}
                onError={() => {
                  toast({
                    title: "Sign in failed",
                    description: "Google sign-in was cancelled or failed",
                    variant: "destructive",
                  });
                }}
                theme="filled_blue"
                size="large"
                text="signin_with"
                shape="pill"
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            For Care of Chan team members with @careofchan.com accounts
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="border-card-border">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Team Directory</CardTitle>
              <CardDescription>
                Browse and search through your organization's complete team roster
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Advanced search and filtering
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Sortable columns
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Quick contact access
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Secure Access</CardTitle>
              <CardDescription>
                Role-based access control ensures data security and privacy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Google sign-in authentication
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Admin and employee roles
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Domain-restricted access
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Profile Management</CardTitle>
              <CardDescription>
                Keep your professional profile up to date for colleagues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Self-service profile editing
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Contact information
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Department and role details
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <footer className="mt-24 text-center text-sm text-muted-foreground">
          <p>Care of Chan OS</p>
          {isDevelopment && (
            <div className="mt-6 pt-6 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => devLoginMutation.mutate("omar@functionalartists.ai")}
                disabled={devLoginMutation.isPending}
                data-testid="button-dev-login"
              >
                {devLoginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <Bug className="mr-2 h-4 w-4" />
                    Dev Login (omar@functionalartists.ai)
                  </>
                )}
              </Button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
