import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Form } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FormFieldRenderer, buildDefaultValues } from "@/components/form-builder";
import {
  FileText,
  Loader2,
  CheckCircle,
  ClipboardList,
  Trash2,
  RotateCcw,
  Save,
  ArrowRightLeft,
} from "lucide-react";
import { format } from "date-fns";
import type {
  DealIntakeWithRelations,
  FormTemplate,
  FormSection,
  FormField,
} from "@shared/schema";

interface DealIntakeTabProps {
  dealId: string;
  canWrite: boolean;
}

function formatReadOnlyValue(field: FormField, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (field.type === "location" && Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value.map((v: { displayName?: string }) => v.displayName || "Unknown").join(", ");
  }
  if (field.type === "eventSchedule" && Array.isArray(value)) {
    if (value.length === 0) return "—";
    return `${value.length} event(s)`;
  }
  if (field.type === "budgetRange" && typeof value === "object") {
    const obj = value as { low?: number; high?: number; notes?: string };
    const parts: string[] = [];
    if (obj.low !== undefined) parts.push(`Low: $${obj.low.toLocaleString()}`);
    if (obj.high !== undefined) parts.push(`High: $${obj.high.toLocaleString()}`);
    if (obj.notes) parts.push(`Notes: ${obj.notes}`);
    return parts.length > 0 ? parts.join(" | ") : "—";
  }
  if (field.type === "services" && Array.isArray(value)) {
    if (value.length === 0) return "—";
    return `${value.length} service(s) selected`;
  }
  if (field.type === "tags" && Array.isArray(value)) {
    if (value.length === 0) return "—";
    return `${value.length} tag(s) selected`;
  }

  return String(value);
}

function ReadOnlyFieldRenderer({ schema, responseData }: { schema: FormSection[]; responseData: Record<string, unknown> }) {
  return (
    <div className="space-y-6" data-testid="intake-readonly">
      {schema.map((section) => (
        <Card key={section.id} className="p-6" data-testid={`readonly-section-${section.id}`}>
          <div className="mb-6">
            <h3 className="text-lg font-semibold">{section.title}</h3>
            {section.description && (
              <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
            )}
          </div>
          <div className="space-y-4">
            {section.fields.map((field) => {
              const value = responseData[field.id];
              const displayValue = formatReadOnlyValue(field, value);

              return (
                <div key={field.id} className="space-y-1" data-testid={`readonly-field-${field.id}`}>
                  <p className="text-sm font-medium text-muted-foreground">
                    {field.name}
                    {field.required && <span className="text-destructive ml-0.5">*</span>}
                  </p>
                  {field.type === "richtext" && typeof value === "string" && value !== "" ? (
                    <div
                      className="text-sm rich-text-html-display"
                      dangerouslySetInnerHTML={{ __html: value }}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{displayValue}</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}

function isIntakeCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  const lower = category.toLowerCase();
  return lower.includes("intake") || lower.includes("questionnaire");
}

function IntakeEmptyState({ dealId, canWrite }: { dealId: string; canWrite: boolean }) {
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  const { data: allTemplates = [], isLoading: isLoadingTemplates } = useQuery<FormTemplate[]>({
    queryKey: ["/api/form-templates"],
  });

  const intakeTemplates = allTemplates.filter((t) => isIntakeCategory(t.category));
  const otherTemplates = allTemplates.filter((t) => !isIntakeCategory(t.category));
  const displayTemplates = showAllTemplates ? allTemplates : (intakeTemplates.length > 0 ? intakeTemplates : allTemplates);

  const createMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await apiRequest("POST", `/api/deals/${dealId}/intake`, { templateId });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Server returned an unexpected response. Please try again.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "intake"] });
      toast({ title: "Intake started", description: "Questionnaire has been created from the selected template." });
      setSelectedTemplateId("");
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed to start intake", description: error.message });
    },
  });

  if (!canWrite) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="intake-empty-readonly">
        <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Intake Questionnaire</h3>
        <p className="text-muted-foreground max-w-sm">
          No intake questionnaire has been created for this deal yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="intake-empty">
      <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No Intake Questionnaire</h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        Start an intake questionnaire by selecting a template. The form will be snapshotted so later template changes won't affect this intake.
      </p>

      {isLoadingTemplates ? (
        <Skeleton className="h-10 w-64" />
      ) : allTemplates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No form templates available. Create one first under Forms &gt; Templates.</p>
      ) : (
        <div className="flex flex-col items-center gap-3 w-full max-w-md">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger className="flex-1" data-testid="select-intake-template">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {displayTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id} data-testid={`option-template-${t.id}`}>
                    <span className="flex items-center gap-2">
                      {t.name}
                      {t.category && (
                        <span className="text-xs text-muted-foreground">({t.category})</span>
                      )}
                      {!t.category && (
                        <span className="text-xs text-muted-foreground">(Uncategorized)</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => selectedTemplateId && createMutation.mutate(selectedTemplateId)}
              disabled={!selectedTemplateId || createMutation.isPending}
              data-testid="button-start-intake"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Start Intake
            </Button>
          </div>
          {intakeTemplates.length > 0 && otherTemplates.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllTemplates(!showAllTemplates)}
              className="text-muted-foreground"
              data-testid="button-toggle-all-templates"
            >
              {showAllTemplates
                ? `Show intake templates only (${intakeTemplates.length})`
                : `Show all templates (${allTemplates.length})`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function IntakeDraftForm({
  dealId,
  intake,
  canWrite,
}: {
  dealId: string;
  intake: DealIntakeWithRelations;
  canWrite: boolean;
}) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  const formSchema = intake.formSchema as FormSection[];
  const existingData = intake.responseData as Record<string, unknown>;

  const defaultValues = {
    ...buildDefaultValues(formSchema),
    ...existingData,
  };

  const form = useForm<Record<string, unknown>>({
    defaultValues,
  });

  useEffect(() => {
    const merged = {
      ...buildDefaultValues(formSchema),
      ...existingData,
    };
    form.reset(merged);
  }, [intake.id]);

  const saveDraftMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", `/api/deals/${dealId}/intake`, {
        responseData: data,
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Server returned an unexpected response. Please try again.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "intake"] });
      toast({ title: "Draft saved", description: "Your intake responses have been saved." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed to save", description: error.message });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", `/api/deals/${dealId}/intake`, {
        responseData: data,
        status: "completed",
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Server returned an unexpected response. Please try again.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "intake"] });
      toast({ title: "Intake completed", description: "The questionnaire has been marked as complete." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed to complete", description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/deals/${dealId}/intake`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "intake"] });
      setShowDeleteDialog(false);
      toast({ title: "Intake removed", description: "The intake questionnaire has been removed." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed to remove", description: error.message });
    },
  });

  const handleSaveDraft = () => {
    const data = form.getValues();
    saveDraftMutation.mutate(data);
  };

  const handleComplete = () => {
    const data = form.getValues();
    completeMutation.mutate(data);
    setShowCompleteDialog(false);
  };

  return (
    <div className="space-y-4 " data-testid="intake-draft-form">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">{intake.templateName}</h3>
            <p className="text-sm text-muted-foreground">
              Started {intake.createdAt ? format(new Date(intake.createdAt), "MMM d, yyyy") : "recently"}
              {intake.createdBy && ` by ${intake.createdBy.firstName} ${intake.createdBy.lastName}`}
            </p>
          </div>
          <Badge variant="secondary" data-testid="badge-intake-status">Draft</Badge>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <SyncToDealButton dealId={dealId} intake={intake} canWrite={canWrite} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              data-testid="button-delete-intake"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </div>
        )}
      </div>

      <Form {...form}>
        <div className="space-y-6">
          <FormFieldRenderer schema={formSchema} form={form as never} />

          {canWrite && (
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={saveDraftMutation.isPending}
                data-testid="button-save-draft"
              >
                {saveDraftMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Draft
              </Button>
              <Button
                onClick={() => setShowCompleteDialog(true)}
                disabled={completeMutation.isPending}
                data-testid="button-mark-complete"
              >
                {completeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Mark Complete
              </Button>
            </div>
          )}
        </div>
      </Form>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Intake Questionnaire</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this intake questionnaire? All responses will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-intake">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-intake"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Intake</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this intake as complete? The form will become read-only after completion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-complete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleComplete}
              disabled={completeMutation.isPending}
              data-testid="button-confirm-complete"
            >
              {completeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function hasMappedFieldsWithData(formSchema: FormSection[], responseData: Record<string, unknown>): boolean {
  for (const section of formSchema) {
    for (const field of section.fields) {
      if (field.entityMapping?.entityType === "deal" && field.entityMapping?.propertyKey) {
        const value = responseData[field.id];
        if (value !== undefined && value !== null && value !== "") {
          if (Array.isArray(value) && value.length === 0) continue;
          if (typeof value === "object" && !Array.isArray(value) && Object.keys(value as object).length === 0) continue;
          return true;
        }
      }
    }
  }
  return false;
}

function formatSyncValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    if (typeof value[0] === "object" && "displayName" in value[0]) {
      return value.map((v: { displayName: string }) => v.displayName).join(", ");
    }
    return `${value.length} item(s)`;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const parts: string[] = [];
    if (obj.low !== undefined) parts.push(`Low: ${obj.low}`);
    if (obj.high !== undefined) parts.push(`High: ${obj.high}`);
    if (obj.notes) parts.push(`Notes: ${obj.notes}`);
    return parts.length > 0 ? parts.join(", ") : JSON.stringify(value);
  }
  return String(value);
}

interface SyncChange {
  propertyKey: string;
  label: string;
  currentValue: unknown;
  newValue: unknown;
  fieldId: string;
}

function SyncToDealButton({ dealId, intake, canWrite }: { dealId: string; intake: DealIntakeWithRelations; canWrite: boolean }) {
  const { toast } = useToast();
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncChanges, setSyncChanges] = useState<SyncChange[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const formSchema = intake.formSchema as FormSection[];
  const responseData = intake.responseData as Record<string, unknown>;
  const hasMapped = hasMappedFieldsWithData(formSchema, responseData);

  const handlePreview = async () => {
    setIsPreviewLoading(true);
    try {
      const res = await apiRequest("POST", `/api/deals/${dealId}/intake/sync`, { dryRun: true });
      const data = await res.json();
      setSyncChanges(data.changes || []);
      setShowSyncDialog(true);
    } catch (error: unknown) {
      toast({ variant: "destructive", title: "Failed to preview sync", description: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/deals/${dealId}/intake/sync`, { dryRun: false });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "tags"] });
      setShowSyncDialog(false);
      toast({ title: "Deal synced", description: "Deal properties have been updated from intake data." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed to sync", description: error.message });
    },
  });

  if (!hasMapped || !canWrite) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePreview}
        disabled={isPreviewLoading}
        data-testid="button-sync-to-deal"
      >
        {isPreviewLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRightLeft className="h-4 w-4" />
        )}
        Sync to Deal
      </Button>

      <AlertDialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Sync Intake to Deal</AlertDialogTitle>
            <AlertDialogDescription>
              The following deal properties will be updated from the intake responses. Existing values will be overwritten.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {syncChanges.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No data to sync. Fields are either empty or have no mapped values.</p>
          ) : (
            <div className="max-h-[300px] overflow-auto space-y-3 py-2">
              {syncChanges.map((change) => (
                <div key={change.propertyKey} className="border rounded-md p-3 space-y-1" data-testid={`sync-change-${change.propertyKey}`}>
                  <p className="text-sm font-medium">{change.label}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Current:</span>
                      <p className="truncate">{formatSyncValue(change.currentValue)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">New:</span>
                      <p className="truncate">{formatSyncValue(change.newValue)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-sync">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || syncChanges.length === 0}
              data-testid="button-confirm-sync"
            >
              {syncMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Apply Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function IntakeCompletedView({
  dealId,
  intake,
  canWrite,
}: {
  dealId: string;
  intake: DealIntakeWithRelations;
  canWrite: boolean;
}) {
  const { toast } = useToast();
  const [showRestartDialog, setShowRestartDialog] = useState(false);

  const formSchema = intake.formSchema as FormSection[];
  const responseData = intake.responseData as Record<string, unknown>;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/deals/${dealId}/intake`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "intake"] });
      setShowRestartDialog(false);
      toast({ title: "Intake removed", description: "You can now start a new intake questionnaire." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed to remove", description: error.message });
    },
  });

  return (
    <div className="space-y-4" data-testid="intake-completed-view">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <h3 className="font-semibold">{intake.templateName}</h3>
            <p className="text-sm text-muted-foreground">
              Completed {intake.completedAt ? format(new Date(intake.completedAt), "MMM d, yyyy") : ""}
              {intake.createdBy && ` by ${intake.createdBy.firstName} ${intake.createdBy.lastName}`}
            </p>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" data-testid="badge-intake-status">
            Completed
          </Badge>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <SyncToDealButton dealId={dealId} intake={intake} canWrite={canWrite} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRestartDialog(true)}
              data-testid="button-restart-intake"
            >
              <RotateCcw className="h-4 w-4" />
              Restart
            </Button>
          </div>
        )}
      </div>

      <ReadOnlyFieldRenderer schema={formSchema} responseData={responseData} />

      <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Intake</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this completed intake? All responses will be lost and you'll need to start a new questionnaire.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-restart">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-restart"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Remove & Restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function DealIntakeTab({ dealId, canWrite }: DealIntakeTabProps) {
  const { data: intake, isLoading } = useQuery<DealIntakeWithRelations | null>({
    queryKey: ["/api/deals", dealId, "intake"],
    enabled: Boolean(dealId),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!intake) {
    return <IntakeEmptyState dealId={dealId} canWrite={canWrite} />;
  }

  if (intake.status === "completed") {
    return <IntakeCompletedView dealId={dealId} intake={intake} canWrite={canWrite} />;
  }

  return <IntakeDraftForm dealId={dealId} intake={intake} canWrite={canWrite} />;
}
