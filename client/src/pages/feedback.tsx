import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CommentList } from "@/components/ui/comments";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircleQuestion } from "lucide-react";
import { InfoBanner } from "@/components/ui/info-banner";

export default function Feedback() {
  usePageTitle("Feedback");
  const { user } = useAuth();

  return (
    <PageLayout breadcrumbs={[{ label: "Feedback" }]}>
              {/* <InfoBanner
            id="feedback-features-tip"
            title="Have a specific request?"
            description="Visit the Features page."
            ctaLabel="App Features"
            ctaUrl="/app/features"
          /> */}
      <div className="p-4 md:p-6 space-y-4">
        <div className="">
          <h1 className="text-2xl font-bold">Feedback</h1>
          <p className="text-muted-foreground text-sm">Share your thoughts, ask questions, or leave general feedback
</p>
        </div>
        <CommentList 
          entityType="feedback" 
          entityId="general" 
          currentUser={user || undefined} 
        />
      </div>

    </PageLayout>
  );
}
