import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface NoPermissionMessageProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
}

export function NoPermissionMessage({
  title = "Permission Required",
  message="You don't have permission to view this page. Please contact an administrator if you need access.",
  showBackButton = true,
  showHomeButton = true,
}: NoPermissionMessageProps) {
  return (
    <div className="pt-12 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="py-12 text-center">
   
          <h1 className="text-lg font-semibold mb-2" data-testid="text-no-permission-title">
            {title}
          </h1>
          <p className="text-muted-foreground mb-6 text-sm" data-testid="text-no-permission-message">
            {message}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {showBackButton && (
              <Button
                variant="secondary"
                onClick={() => window.history.back()}
                data-testid="button-permission-go-back"
              >
                Go Back
              </Button>
            )}
            {/* {showHomeButton && (
              <Link href="/">
                <Button data-testid="button-permission-go-home">
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </Button>
              </Link>
            )} */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
