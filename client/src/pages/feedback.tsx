import { PageLayout } from "@/framework";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CommentList } from "@/components/ui/comments";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircleQuestion } from "lucide-react";
import { InfoBanner } from "@/components/ui/info-banner";

export default function Feedback() {
  const { user } = useAuth();

  return (
    <PageLayout breadcrumbs={[{ label: "App" },{ label: "Feedback" }]}>
      <Card className="rounded-none border-none" >
        <CardHeader className="pb-4">

          <CardDescription>
            Share your thoughts, ask questions, or leave general feedback
          </CardDescription>
        </CardHeader>
        <CardContent >
          <InfoBanner
            id="feedback-features-tip"
            title="Need a change or new feature?"
            description="Submit requests in the App Features section."
            ctaLabel="App Features"
            ctaUrl="/app/features"
          />
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
