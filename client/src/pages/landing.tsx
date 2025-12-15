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

    <div className="max-w-4xl mx-auto h-screen flex flex-col  justify-center text-center gap-4">
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight ">
        <p className="text-xs opacity-50 mb-2 tracking-wide font-light">
          COCA 1.0
        </p>
        Care of Chan App
      </h1>

      <p className="text-sm text-muted-foreground mb-4 ">
        Sign in with your careofchan.com email.
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
      {isDevelopment && (
        <div className="mt-6 pt-6 ">
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
    </div>
  );
}
