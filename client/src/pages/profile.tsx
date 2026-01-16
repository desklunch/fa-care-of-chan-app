import { useEffect } from "react";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuth } from "@/hooks/useAuth";
import { PageLayout } from "@/framework";

export default function Profile() {
  usePageTitle("Profile");
  const { user, isLoading } = useAuth();
  const [, setLocation] = useProtectedLocation();

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
