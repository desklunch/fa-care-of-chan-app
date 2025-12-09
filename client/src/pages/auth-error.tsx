import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, Mail } from "lucide-react";
import { useSearch } from "wouter";

export default function AuthError() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const reason = params.get("reason");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-card-border">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl" data-testid="text-auth-error-title">
            Access Denied
          </CardTitle>
          <CardDescription>
            {reason === "domain" ? (
              <>
                This application is only available to Care of Chan team members.
              </>
            ) : (
              <>
                There was a problem signing you in.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reason === "domain" && (
            <div className="bg-accent/30 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Required email domain:</span>
                <span className="font-medium" data-testid="text-required-domain">@careofchan.com</span>
              </div>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground text-center">
            {reason === "domain" ? (
              <>
                Please sign in with your <strong>@careofchan.com</strong> Google account to access Care of Chan OS.
              </>
            ) : (
              <>
                Please try again or contact your administrator if the problem persists.
              </>
            )}
          </p>

          <a href="/" className="block">
            <Button variant="outline" className="w-full" data-testid="button-back-home">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
