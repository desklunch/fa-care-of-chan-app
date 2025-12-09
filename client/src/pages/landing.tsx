import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Shield, ArrowRight } from "lucide-react";

export default function Landing() {
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
          <a href="/api/login">
            <Button data-testid="button-sign-in">
              Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </nav>

        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Care of Chan OS
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            A centralized platform for managing your organization's venues, vendors, and team. 
            Connect with colleagues, access contact details, and maintain accurate records.
          </p>
          <a href="/api/login">
            <Button size="lg" className="h-12 px-8" data-testid="button-get-started">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </a>
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
                  Single sign-on authentication
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Admin and employee roles
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Invite-based registration
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
        </footer>
      </div>
    </div>
  );
}
