import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { PageLayout } from "@/framework";

export default function Profile() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user?.id) {
      setLocation(`/team/${user.id}`, { replace: true });
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Profile" }]}>
        <div className="p-6 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return null;
}
