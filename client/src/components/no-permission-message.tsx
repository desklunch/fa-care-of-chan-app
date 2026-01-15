import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldX, ArrowLeft, Home } from "lucide-react";

interface NoPermissionMessageProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
}

export function NoPermissionMessage({
  title = "Permission Required",
  message = "You don't have permission to access this page. Please contact an administrator if you believe you should have access.",
  showBackButton = true,
  showHomeButton = true,
}: NoPermissionMessageProps) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-card-border">
        <CardContent className="py-12 text-center">
          <div className="flex justify-center mb-4">
            <ShieldX className="h-16 w-16 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold mb-2" data-testid="text-no-permission-title">
            {title}
          </h1>
          <p className="text-muted-foreground mb-6" data-testid="text-no-permission-message">
            {message}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {showBackButton && (
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                data-testid="button-permission-go-back"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            )}
            {showHomeButton && (
              <Link href="/">
                <Button data-testid="button-permission-go-home">
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
