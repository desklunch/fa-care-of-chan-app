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
    <PageLayout breadcrumbs={[{ label: "App" },{ label: "Feedback" }]}>
              {/* <InfoBanner
            id="feedback-features-tip"
            title="Have a specific request?"
            description="Visit the Features page."
            ctaLabel="App Features"
            ctaUrl="/app/features"
          /> */}
      <Card className="rounded-none border-none" >
        <CardHeader className="pb-4">

          <CardDescription>
            Share your thoughts, ask questions, or leave general feedback
          </CardDescription>
        </CardHeader>
        <CardContent >
  
          <CommentList 
            entityType="feedback" 
            entityId="general" 
            currentUser={user || undefined} 
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
