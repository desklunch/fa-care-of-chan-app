import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ArrowRight, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import type { Invite } from "@shared/schema";

export default function InviteActivation() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(search);
  const token = params.get("token");

  const { data: invite, isLoading, error } = useQuery<Invite>({
    queryKey: ["/api/invites/validate", token],
    enabled: !!token,
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-card-border">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Invalid Invitation</CardTitle>
            <CardDescription>
              No invitation token was provided. Please use the link from your invitation email.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <a href="/">
              <Button variant="outline" data-testid="button-back-home">
                Back to Home
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-card-border">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Validating your invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-card-border">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Invalid or Expired Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid, has already been used, or has expired. 
              Please contact your administrator for a new invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <a href="/">
              <Button variant="outline" data-testid="button-back-home">
                Back to Home
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-card-border">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">Activate Your Account</CardTitle>
          <CardDescription>
            You've been invited to join the Employee Directory
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-accent/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Invited email:</span>
              <span className="font-medium" data-testid="text-invite-email">{invite.email}</span>
            </div>
            {invite.firstName && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium" data-testid="text-invite-name">
                  {invite.firstName} {invite.lastName}
                </span>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Sign in with your account to activate your employee profile and access the directory.
          </p>

          <a href={`/api/login?invite=${token}`} className="block">
            <Button className="w-full h-11" data-testid="button-activate-account">
              Sign In to Activate
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
