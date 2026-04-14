import logoImage from "@assets/coc-icon-1_1769700566602.png";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Users, Shield, Loader2, KeyboardMusic } from "lucide-react";
import Logo from "@/framework/components/logo";
import { GoogleLogin } from "@react-oauth/google";
import { useGoogleAuth } from "@/lib/google-auth";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getAndClearReturnUrl } from "@/lib/return-url";

const isDevelopment = import.meta.env.DEV;

export default function Landing() {
  const [, setLocation] = useProtectedLocation();
  const { toast } = useToast();
  const { isGoogleAuthAvailable } = useGoogleAuth();

  const loginMutation = useMutation({
    mutationFn: async (credential: string) => {
      const res = await apiRequest("POST", "/api/auth/google", { credential });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      const returnUrl = getAndClearReturnUrl();
      setLocation(returnUrl || "/");
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
      const returnUrl = getAndClearReturnUrl();
      setLocation(returnUrl || "/");
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
    <div className="mx-auto h-screen flex flex-col items-center justify-center text-center gap-6 text-primary p-6 bg-card ">
      <div className="w-full bg-background max-w-md rounded-[24px] shadow-lg border border-input p-6 flex flex-col items-center gap-2 ">
        <div className="flex justify-center mb-6 [&_*]:fill-primary mt-4">
          <img src={logoImage} alt="Care of Chan OS" className="rounded-xl" />
        </div>

        <div className="rounded-md bg-primary text-background w-fit p-2 py-1 text-sm tracking-wide">
          CoCOS 1.8.0
        </div>

        {/* Desktop: Show sign-in */}
        <div
          className="flex flex-col items-center gap-6 my-6"
          data-testid="button-get-started"
        >
          <p className="text-base mt-4">
            Sign in with your Care of Chan account.
          </p>
          {loginMutation.isPending ? (
            <Button size="lg" className="h-12 px-8 " disabled>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Signing in...
            </Button>
          ) : isGoogleAuthAvailable ? (
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
          ) : (
            <p className="text-sm text-muted-foreground">
              Google sign-in is not configured
            </p>
          )}

          <p className="text-xs max-w-64 text-muted-foreground leading-[1.5em]">
            This app is not yet fully optimized for mobile devices. Please use a
            desktop computer.
          </p>
        </div>

        {isDevelopment && (
          <div className="">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                devLoginMutation.mutate("omar@functionalartists.ai")
              }
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
                  <KeyboardMusic className="mr-2 h-4 w-4" />
                  Dev Login (omar@functionalartists.ai)
                </>
              )}
            </Button>
          </div>
        )}

        {/* Mobile: Show not optimized message */}
        <div className="flex items-center" data-testid="mobile-notice"></div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2" data-testid="legal-links">
          <Link href="/terms" className="underline hover-elevate rounded px-1 py-0.5" data-testid="link-terms">Terms of Use</Link>
          <span>·</span>
          <Link href="/privacy" className="underline hover-elevate rounded px-1 py-0.5" data-testid="link-privacy">Employee Privacy Notice</Link>
        </div>
      </div>
    </div>
  );
}
