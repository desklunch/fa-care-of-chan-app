import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FormFieldRenderer, buildDefaultValues } from "@/components/form-builder";
import { CheckCircle, AlertCircle, Clock, FileText } from "lucide-react";
import type { FormSection } from "@shared/schema";
import { format } from "date-fns";

interface PublicFormData {
  title: string;
  description: string | null;
  formSchema: FormSection[];
  dueDate: string | null;
  recipientName: string;
  recipientType: "vendor" | "contact";
  hasResponded: boolean;
  existingResponse: Record<string, unknown> | null;
}

function FormExpired() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-xl font-semibold mb-2">Form Expired or Not Found</h1>
        <p className="text-muted-foreground">
          This form link has expired or is no longer valid. Please contact the sender for a new link.
        </p>
      </Card>
    </div>
  );
}

function FormSubmitted() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h1 className="text-xl font-semibold mb-2">Thank You!</h1>
        <p className="text-muted-foreground">
          Your response has been submitted successfully. You can close this window now.
        </p>
      </Card>
    </div>
  );
}

export default function PublicFormPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { data: formData, isLoading, error } = useQuery<PublicFormData>({
    queryKey: ["/api/form", token],
    queryFn: async () => {
      const res = await fetch(`/api/form/${token}`);
      if (!res.ok) {
        throw new Error("Form not found");
      }
      return res.json();
    },
  });

  const form = useForm<Record<string, unknown>>({
    defaultValues: formData?.existingResponse || buildDefaultValues(formData?.formSchema || []),
  });

  const submitMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/form/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseData: data }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({ title: "Response submitted", description: "Your response has been saved." });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Failed to submit response.",
      });
    },
  });

  const onSubmit = (data: Record<string, unknown>) => {
    submitMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !formData) {
    return <FormExpired />;
  }

  if (isSubmitted) {
    return <FormSubmitted />;
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold mb-2">{formData.title}</h1>
              {formData.description && (
                <p className="text-muted-foreground mb-4">{formData.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Hello, {formData.recipientName}</span>
                {formData.dueDate && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Due: {format(new Date(formData.dueDate), "MMMM d, yyyy")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {formData.hasResponded && formData.existingResponse && (
          <Card className="p-4 mb-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <CheckCircle className="h-4 w-4" />
              <p className="text-sm font-medium">
                You have already submitted a response. You can update it below.
              </p>
            </div>
          </Card>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormFieldRenderer schema={formData.formSchema} form={form as never} />

            <div className="flex justify-end gap-4">
              <Button
                type="submit"
                size="lg"
                disabled={submitMutation.isPending}
                data-testid="button-submit-form"
              >
                {submitMutation.isPending
                  ? "Submitting..."
                  : formData.hasResponded
                  ? "Update Response"
                  : "Submit Response"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
