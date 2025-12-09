import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, Mail, ShieldX } from "lucide-react";
import { useSearch } from "wouter";

export default function AuthError() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const reason = params.get("reason");

  const isDomainError = reason === "domain";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-destructive/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-destructive/30">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            {isDomainError ? (
              <ShieldX className="h-8 w-8 text-destructive" />
            ) : (
              <AlertCircle className="h-8 w-8 text-destructive" />
            )}
          </div>
          <CardTitle className="text-2xl text-destructive" data-testid="text-auth-error-title">
            {isDomainError ? "Unauthorized Email Domain" : "Access Denied"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isDomainError ? (
            <>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
                <p className="text-base font-medium text-foreground mb-2">
                  Your Google account is not authorized
                </p>
                <p className="text-sm text-muted-foreground">
                  Care of Chan OS is only available to team members with a <strong className="text-foreground">@careofchan.com</strong> email address.
                </p>
              </div>

              <div className="bg-accent/50 rounded-lg p-4">
                <div className="flex items-center justify-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Required Domain</p>
                    <p className="font-semibold text-lg" data-testid="text-required-domain">@careofchan.com</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Please sign out of your current Google account and sign in with your <strong>@careofchan.com</strong> work account.
              </p>
            </>
          ) : (
            <>
              <CardDescription className="text-center">
                There was a problem signing you in.
              </CardDescription>
              <p className="text-sm text-muted-foreground text-center">
                Please try again or contact your administrator if the problem persists.
              </p>
            </>
          )}

          <a href="/" className="block">
            <Button variant="outline" className="w-full h-11" data-testid="button-back-home">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
