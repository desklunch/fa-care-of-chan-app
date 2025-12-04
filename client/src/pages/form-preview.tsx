import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Form } from "@/components/ui/form";
import { FormFieldRenderer, buildDefaultValues } from "@/components/form-builder";
import { AlertCircle, Clock, FileText, Eye } from "lucide-react";
import type { FormSection } from "@shared/schema";
import { format } from "date-fns";

interface PreviewFormData {
  request: {
    title: string;
    description: string | null;
    formSchema: FormSection[];
    dueDate: string | null;
  };
  recipient: {
    name: string;
    type: "vendor" | "contact";
    email: string;
  };
  isPreview: boolean;
  existingResponse: null;
}

function PreviewError() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-xl font-semibold mb-2">Preview Not Available</h1>
        <p className="text-muted-foreground">
          Unable to load the form preview. Please check your permissions and try again.
        </p>
      </Card>
    </div>
  );
}

export default function FormPreviewPage() {
  const { requestId } = useParams<{ requestId: string }>();

  const { data: previewData, isLoading, error } = useQuery<PreviewFormData>({
    queryKey: ["/api/form-requests", requestId, "preview"],
    queryFn: async () => {
      const res = await fetch(`/api/form-requests/${requestId}/preview`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Preview not available");
      }
      return res.json();
    },
  });

  const defaultValues = previewData?.request.formSchema 
    ? buildDefaultValues(previewData.request.formSchema) 
    : {};

  const form = useForm<Record<string, unknown>>({
    defaultValues,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-12" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !previewData) {
    return <PreviewError />;
  }

  const { request, recipient } = previewData;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-amber-500 text-white py-3 px-4 sticky top-0 z-50" data-testid="banner-preview">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-2">
          <Eye className="h-5 w-5" />
          <span className="font-medium">
            Preview Mode - This is how recipients will see the form
          </span>
        </div>
      </div>

      <div className="py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold mb-2">{request.title}</h1>
                {request.description && (
                  <p className="text-muted-foreground mb-4">{request.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Hello, {recipient.name}</span>
                  {request.dueDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Due: {format(new Date(request.dueDate), "MMMM d, yyyy")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              <FormFieldRenderer schema={request.formSchema} form={form as never} />

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  size="lg"
                  disabled
                  className="opacity-50 cursor-not-allowed"
                  data-testid="button-submit-form-disabled"
                >
                  Submit Response
                </Button>
              </div>
            </form>
          </Form>

          <Card className="p-4 mt-6 bg-muted/50 border-dashed">
            <p className="text-sm text-muted-foreground text-center">
              This is a preview. The submit button is disabled and no data will be saved.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
