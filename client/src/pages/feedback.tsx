import { PageLayout } from "@/framework";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CommentList } from "@/components/ui/comments";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircleQuestion } from "lucide-react";

export default function Feedback() {
  const { user } = useAuth();

  return (
    <PageLayout breadcrumbs={[{ label: "Feedback" }]}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageCircleQuestion className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Feedback</CardTitle>
          </div>
          <CardDescription>
            Share your thoughts, ask questions, or leave general feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
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
