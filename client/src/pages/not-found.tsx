import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="pt-12 bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="text-center">
          <h1 className="text-lg font-semibold mb-2">Page Does Not Exist</h1>
          <p className="text-sm text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
     
        </CardContent>
      </Card>
    </div>
  );
}
