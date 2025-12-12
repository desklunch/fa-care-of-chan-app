import { PageLayout } from "@/framework";
import { Card, CardContent } from "@/components/ui/card";
import { CommentList } from "@/components/ui/comments";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircleQuestion } from "lucide-react";

export default function Feedback() {
  const { user } = useAuth();

  return (
    <PageLayout
      title="Feedback"
      description="Share your thoughts, ask questions, or leave general feedback"
      icon={MessageCircleQuestion}
    >
      <Card>
        <CardContent className="pt-6">
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
