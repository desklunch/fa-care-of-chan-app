import { useState, useEffect, useRef, useCallback } from "react";
import { MarkdownDisplay } from "@/components/markdown-display";
import { normalizeToMarkdown } from "@/lib/markdown-utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Form } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  FormFieldRenderer,
  buildIntakeDefaultValues,
} from "@/components/form-builder";
import {
  FileText,
  Loader2,
  CheckCircle,
  ClipboardList,
  Trash2,
  ArrowRightLeft,
  Check,
  AlertCircle,
  ChevronDown,
  MoreVertical,
  CloudUpload,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import {
  buildIntakeFieldKey,
  type DealIntakeWithRelations,
  type FormTemplate,
  type FormSection,
  type FormField,
} from "@shared/schema";

export type IntakeKind = "intake" | "discovery";

interface IntakeKindConfig {
  kind: IntakeKind;
  endpoint: "intake" | "discovery";
  title: string;
  startedTitle: string;
  startedDescription: string;
  emptyHeading: string;
  emptyDescriptionWritable: string;
  emptyDescriptionReadOnly: string;
  startButtonLabel: string;
  startFailedTitle: string;
  resetMenuLabel: string;
  removeDialogTitle: string;
  removeDialogDescription: string;
  removedToastTitle: string;
  removedToastDescription: string;
  removeFailedTitle: string;
  mergeDialogDescription: string;
  noMergeTemplatesMessage: string;
  templateCategoryFilter: (cat: string | null | undefined) => boolean;
  testIdPrefix: string; // "intake" or "discovery" — applied to top-level data-testids
}

const INTAKE_CONFIG: IntakeKindConfig = {
  kind: "intake",
  endpoint: "intake",
  title: "Intake Questionnaire",
  startedTitle: "Intake started",
  startedDescription: "Questionnaire has been created from the selected template.",
  emptyHeading: "No Intake Questionnaire",
  emptyDescriptionWritable:
    "Start an intake questionnaire by selecting a template. The form will be snapshotted so later template changes won't affect this intake.",
  emptyDescriptionReadOnly: "No intake questionnaire has been created for this deal yet.",
  startButtonLabel: "Start Intake",
  startFailedTitle: "Failed to start intake",
  resetMenuLabel: "Reset Intake",
  removeDialogTitle: "Remove Intake Questionnaire",
  removeDialogDescription:
    "Are you sure you want to remove this intake questionnaire? All responses will be lost. This action cannot be undone.",
  removedToastTitle: "Intake removed",
  removedToastDescription: "The intake questionnaire has been removed.",
  removeFailedTitle: "Failed to remove",
  mergeDialogDescription:
    "Pick one or more client intake templates to append their sections to this draft intake. Templates whose namespace is already present cannot be added again.",
  noMergeTemplatesMessage: "No client intake templates available.",
  templateCategoryFilter: isIntakeCategory,
  testIdPrefix: "intake",
};

const DISCOVERY_CONFIG: IntakeKindConfig = {
  kind: "discovery",
  endpoint: "discovery",
  title: "Deal Discovery",
  startedTitle: "Deal Discovery started",
  startedDescription: "Discovery has been created from the selected template.",
  emptyHeading: "No Deal Discovery",
  emptyDescriptionWritable:
    "Start a deal discovery by selecting a template. The form will be snapshotted so later template changes won't affect this discovery.",
  emptyDescriptionReadOnly: "No deal discovery has been created for this deal yet.",
  startButtonLabel: "Start Discovery",
  startFailedTitle: "Failed to start discovery",
  resetMenuLabel: "Reset Discovery",
  removeDialogTitle: "Remove Deal Discovery",
  removeDialogDescription:
    "Are you sure you want to remove this deal discovery? All responses will be lost. This action cannot be undone.",
  removedToastTitle: "Discovery removed",
  removedToastDescription: "The deal discovery has been removed.",
  removeFailedTitle: "Failed to remove",
  mergeDialogDescription:
    "Pick one or more deal discovery templates to append their sections to this draft discovery. Templates whose namespace is already present cannot be added again.",
  noMergeTemplatesMessage: "No deal discovery templates available.",
  templateCategoryFilter: (cat) => (cat ?? "").toLowerCase() === "deal_discovery",
  testIdPrefix: "discovery",
};

export function getIntakeKindConfig(kind: IntakeKind): IntakeKindConfig {
  return kind === "discovery" ? DISCOVERY_CONFIG : INTAKE_CONFIG;
}

interface DealIntakeTabProps {
  dealId: string;
  canWrite: boolean;
  onSaveToGoogleDrive?: () => void;
  canSaveToGoogleDrive?: boolean;
  kind?: IntakeKind;
}

function formatReadOnlyValue(field: FormField, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (field.type === "location" && Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value
      .map((v: { displayName?: string }) => v.displayName || "Unknown")
      .join(", ");
  }
  if (field.type === "eventSchedule" && Array.isArray(value)) {
    if (value.length === 0) return "—";
    return `${value.length} event(s)`;
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

function ReadOnlySectionCard({
  section,
  responseData,
  defaultExpanded = true,
}: {
  section: FormSection;
  responseData: Record<string, unknown>;
  defaultExpanded?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);

  return (
    <Card className="p-6" data-testid={`readonly-section-${section.id}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 w-full text-left cursor-pointer "
            data-testid={`readonly-section-toggle-${section.id}`}
          >
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 -rotate-90",
                isOpen && "rotate-0",
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">{section.title}</h3>
                <span
                  className="text-sm text-muted-foreground shrink-0"
                  data-testid={`readonly-section-field-count-${section.id}`}
                >
                  {section.fields.length}{" "}
                  {section.fields.length === 1 ? "field" : "fields"}
                </span>
              </div>
              {section.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {section.description}
                </p>
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 pt-6">
            {section.fields.map((field) => {
              const key = buildIntakeFieldKey(
                section.templateNamespace,
                field.id,
              );
              const value = responseData[key];
              const displayValue = formatReadOnlyValue(field, value);

              return (
                <div
                  key={field.id}
                  className="grid grid-cols-3 gap-4 items-start"
                  data-testid={`readonly-field-${field.id}`}
                >
                  <div className="col-span-1 pt-0.5">
                    <p className="text-sm font-medium text-muted-foreground">
                      {field.name}
                      {field.required && (
                        <span className="text-destructive ml-0.5">*</span>
                      )}
                    </p>
                  </div>
                  <div className="col-span-2">
                    {field.type === "richtext" &&
                    typeof value === "string" &&
                    value !== "" ? (
                      <MarkdownDisplay className="text-sm prose dark:prose-invert max-w-none [&>*]:my-[0.625em] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        {normalizeToMarkdown(value as string)}
                      </MarkdownDisplay>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">
                        {displayValue}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function ReadOnlyFieldRenderer({
  schema,
  responseData,
}: {
  schema: FormSection[];
  responseData: Record<string, unknown>;
}) {
  return (
    <div className="space-y-4" data-testid="intake-readonly">
      {schema.map((section, index) => (
        <ReadOnlySectionCard
          key={section.id}
          section={section}
          responseData={responseData}
          defaultExpanded={false}
        />
      ))}
    </div>
  );
}
function isIntakeCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  const lower = category.toLowerCase();
  return lower.includes("intake") || lower.includes("questionnaire");
}

/**
 * Errors thrown by `apiRequest` are formatted as `"<status>: <body>"` where
 * `<body>` is typically a JSON payload like `{"message":"…"}`. Surface the
 * server-provided `message` when present so toasts read cleanly instead of
 * showing raw status + JSON.
 */
function extractApiErrorMessage(error: Error): string {
  const raw = error.message ?? "";
  const colonIdx = raw.indexOf(":");
  if (colonIdx > -1) {
    const body = raw.slice(colonIdx + 1).trim();
    if (body.startsWith("{")) {
      try {
        const parsed = JSON.parse(body) as { message?: unknown };
        if (typeof parsed.message === "string" && parsed.message.length > 0) {
          return parsed.message;
        }
      } catch {
        // fall through to raw message
      }
    }
    if (body.length > 0) return body;
  }
  return raw || "An unexpected error occurred.";
}

function IntakeEmptyState({
  dealId,
  canWrite,
  config,
}: {
  dealId: string;
  canWrite: boolean;
  config: IntakeKindConfig;
}) {
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const { data: allTemplates = [], isLoading: isLoadingTemplates } = useQuery<
    FormTemplate[]
  >({
    queryKey: ["/api/form-templates"],
  });

  const displayTemplates = allTemplates.filter((t) =>
    config.templateCategoryFilter(t.category),
  );

  const createMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await apiRequest(
        "POST",
        `/api/deals/${dealId}/${config.endpoint}`,
        { templateId },
      );
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          "Server returned an unexpected response. Please try again.",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/deals", dealId, config.endpoint],
      });
      toast({
        title: config.startedTitle,
        description: config.startedDescription,
      });
      setSelectedTemplateId("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: config.startFailedTitle,
        description: error.message,
      });
    },
  });

  if (!canWrite) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 text-center"
        data-testid={`${config.testIdPrefix}-empty-readonly`}
      >
        <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{config.emptyHeading}</h3>
        <p className="text-muted-foreground max-w-sm">
          {config.emptyDescriptionReadOnly}
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center py-12 text-center"
      data-testid={`${config.testIdPrefix}-empty`}
    >
      <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">{config.emptyHeading}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        {config.emptyDescriptionWritable}
      </p>

      {isLoadingTemplates ? (
        <Skeleton className="h-10 w-64" />
      ) : displayTemplates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {config.kind === "discovery"
            ? "No deal discovery templates available. Create one first under Forms > Templates with category 'deal_discovery'."
            : "No form templates available. Create one first under Forms > Templates."}
        </p>
      ) : (
        <div className="flex flex-col items-center gap-3 w-full max-w-md">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
            >
              <SelectTrigger
                className="flex-1"
                data-testid={`select-${config.testIdPrefix}-template`}
              >
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {displayTemplates.map((t) => (
                  <SelectItem
                    key={t.id}
                    value={t.id}
                    data-testid={`option-template-${t.id}`}
                  >
                    <span className="flex items-center gap-2">
                      {t.name}
                      {t.category && (
                        <span className="text-xs text-muted-foreground">
                          ({t.category})
                        </span>
                      )}
                      {!t.category && (
                        <span className="text-xs text-muted-foreground">
                          (Uncategorized)
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() =>
                selectedTemplateId && createMutation.mutate(selectedTemplateId)
              }
              disabled={!selectedTemplateId || createMutation.isPending}
              data-testid={`button-start-${config.testIdPrefix}`}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {config.startButtonLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  return (
    <span
      className="flex items-center gap-1.5 text-xs"
      data-testid="save-status-indicator"
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving…</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
          <span className="text-green-600 dark:text-green-400">Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-3 w-3 text-destructive" />
          <span className="text-destructive">Save failed</span>
        </>
      )}
    </span>
  );
}

function IntakeDraftForm({
  dealId,
  intake,
  canWrite,
  onSaveToGoogleDrive,
  canSaveToGoogleDrive,
  config,
}: {
  dealId: string;
  intake: DealIntakeWithRelations;
  canWrite: boolean;
  onSaveToGoogleDrive?: () => void;
  canSaveToGoogleDrive?: boolean;
  config: IntakeKindConfig;
}) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [selectedMergeIds, setSelectedMergeIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  const [localFormSchema, setLocalFormSchema] = useState<FormSection[]>(
    intake.formSchema as FormSection[],
  );

  const isDraft = intake.status === "draft";
  const canMerge = canWrite && isDraft;

  const { data: allMergeTemplates = [] } = useQuery<FormTemplate[]>({
    queryKey: ["/api/form-templates"],
    enabled: canMerge,
  });

  const usedNamespaces = new Set(
    localFormSchema
      .map((s) => s.templateNamespace)
      .filter((n): n is string => !!n),
  );
  const intakeMergeTemplates = allMergeTemplates.filter((t) =>
    config.templateCategoryFilter(t.category),
  );
  const mergeTemplateOptions = intakeMergeTemplates.map((t) => ({
    template: t,
    alreadyMerged: usedNamespaces.has(t.namespace),
  }));

  const mergeMutation = useMutation({
    mutationFn: async (templateIds: string[]) => {
      // Flush any pending autosave so the server has the user's latest
      // edits before we merge — otherwise the merge response (which echoes
      // persisted responseData) could overwrite them on the local reset.
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
        const pendingValues = form.getValues();
        setSaveStatus("saving");
        await autosaveMutation.mutateAsync({ responseData: pendingValues });
      }

      const mergedNames: string[] = [];
      let latestIntake: DealIntakeWithRelations | null = null;
      for (const templateId of templateIds) {
        const res = await apiRequest(
          "POST",
          `/api/deals/${dealId}/${config.endpoint}/merge`,
          { templateId },
        );
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error(
            "Server returned an unexpected response. Please try again.",
          );
        }
        const updated = (await res.json()) as DealIntakeWithRelations;
        latestIntake = updated;
        const tmpl = allMergeTemplates.find((t) => t.id === templateId);
        if (tmpl) mergedNames.push(tmpl.name);
      }
      return { latestIntake, mergedNames };
    },
    onSuccess: ({ latestIntake, mergedNames }) => {
      // Apply the latest server-returned schema/data immediately so the
      // appended sections and fields appear without waiting for refetch.
      if (latestIntake) {
        const newSchema = latestIntake.formSchema as FormSection[];
        const newResponseData = latestIntake.responseData as Record<
          string,
          unknown
        >;
        setLocalFormSchema(newSchema);
        const merged = {
          ...buildIntakeDefaultValues(newSchema),
          ...newResponseData,
        };
        form.reset(merged);
        isInitialMount.current = true;
      }
      queryClient.invalidateQueries({
        queryKey: ["/api/deals", dealId, config.endpoint],
      });
      const itemLabel = config.kind === "discovery" ? "discovery" : "intake";
      const description =
        mergedNames.length === 1
          ? `Sections from "${mergedNames[0]}" were appended to this ${itemLabel}.`
          : `Sections from ${mergedNames.length} templates (${mergedNames
              .map((n) => `"${n}"`)
              .join(", ")}) were appended to this ${itemLabel}.`;
      toast({
        title:
          mergedNames.length === 1
            ? "Template merged"
            : `${mergedNames.length} templates merged`,
        description,
      });
      setShowMergeDialog(false);
      setSelectedMergeIds(new Set());
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to merge template",
        description: extractApiErrorMessage(error),
      });
    },
  });

  const existingData = intake.responseData as Record<string, unknown>;

  const defaultValues = {
    ...buildIntakeDefaultValues(localFormSchema),
    ...existingData,
  };

  const form = useForm<Record<string, unknown>>({
    defaultValues,
  });

  useEffect(() => {
    const schema = intake.formSchema as FormSection[];
    setLocalFormSchema(schema);
    const merged = {
      ...buildIntakeDefaultValues(schema),
      ...existingData,
    };
    form.reset(merged);
    isInitialMount.current = true;
    setSaveStatus("idle");
  }, [intake.id]);

  const autosaveMutation = useMutation({
    mutationFn: async (payload: {
      responseData?: Record<string, unknown>;
      formSchema?: FormSection[];
    }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/deals/${dealId}/${config.endpoint}`,
        payload,
      );
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          "Server returned an unexpected response. Please try again.",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      setSaveStatus("saved");
      queryClient.invalidateQueries({
        queryKey: ["/api/deals", dealId, config.endpoint],
      });
    },
    onError: (error: Error) => {
      setSaveStatus("error");
      toast({
        variant: "destructive",
        title: "Autosave failed",
        description: error.message,
      });
    },
  });

  const debouncedSave = useCallback(
    (data: Record<string, unknown>) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        setSaveStatus("saving");
        autosaveMutation.mutate({ responseData: data });
      }, 2000);
    },
    [dealId],
  );

  useEffect(() => {
    if (!canWrite) return;

    const subscription = form.watch((values) => {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }
      debouncedSave(values as Record<string, unknown>);
    });

    return () => {
      subscription.unsubscribe();
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [form, debouncedSave, canWrite]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/deals/${dealId}/${config.endpoint}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/deals", dealId, config.endpoint],
      });
      setShowDeleteDialog(false);
      toast({
        title: config.removedToastTitle,
        description: config.removedToastDescription,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: config.removeFailedTitle,
        description: error.message,
      });
    },
  });

  const handleDeleteField = useCallback(
    (sectionId: string, fieldId: string) => {
      const targetSection = localFormSchema.find((s) => s.id === sectionId);
      const ns = targetSection?.templateNamespace;
      const fieldKey = buildIntakeFieldKey(ns, fieldId);

      const updatedSchema = localFormSchema.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            fields: section.fields.filter((f) => f.id !== fieldId),
          };
        }
        return section;
      });

      setLocalFormSchema(updatedSchema);
      form.unregister(fieldKey);

      setSaveStatus("saving");
      const currentValues = form.getValues();
      const { [fieldKey]: _removed, ...cleanedValues } = currentValues;
      autosaveMutation.mutate({
        formSchema: updatedSchema,
        responseData: cleanedValues,
      });
    },
    [localFormSchema, form, autosaveMutation],
  );

  const handleAddField = useCallback(
    (sectionId: string, fieldTitle: string) => {
      const newFieldId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const newField: FormField = {
        id: newFieldId,
        name: fieldTitle,
        type: "richtext",
        placeholder: "",
      };

      const targetSection = localFormSchema.find((s) => s.id === sectionId);
      const ns = targetSection?.templateNamespace;
      const fieldKey = buildIntakeFieldKey(ns, newFieldId);

      const updatedSchema = localFormSchema.map((section) => {
        if (section.id === sectionId) {
          return { ...section, fields: [...section.fields, newField] };
        }
        return section;
      });

      setLocalFormSchema(updatedSchema);
      form.setValue(fieldKey, "");

      setSaveStatus("saving");
      const currentValues = form.getValues();
      autosaveMutation.mutate({
        formSchema: updatedSchema,
        responseData: { ...currentValues, [fieldKey]: "" },
      });
    },
    [localFormSchema, form, autosaveMutation],
  );

  const handleAddSection = useCallback(
    (title: string, description?: string) => {
      const newSection: FormSection = {
        id: `custom_section_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title,
        ...(description ? { description } : {}),
        fields: [],
      };

      const updatedSchema = [...localFormSchema, newSection];
      setLocalFormSchema(updatedSchema);

      setSaveStatus("saving");
      const currentValues = form.getValues();
      autosaveMutation.mutate({
        formSchema: updatedSchema,
        responseData: currentValues,
      });
    },
    [localFormSchema, form, autosaveMutation],
  );

  const handleEditSection = useCallback(
    (sectionId: string, title: string, description?: string) => {
      const target = localFormSchema.find((s) => s.id === sectionId);
      if (!target) return;

      const trimmedTitle = title.trim();
      if (!trimmedTitle) return;
      const trimmedDescription = description?.trim();

      if (
        target.title === trimmedTitle &&
        (target.description ?? "") === (trimmedDescription ?? "")
      ) {
        return;
      }

      const updatedSchema = localFormSchema.map((section) => {
        if (section.id !== sectionId) return section;
        const next: FormSection = {
          ...section,
          title: trimmedTitle,
        };
        if (trimmedDescription) {
          next.description = trimmedDescription;
        } else {
          delete next.description;
        }
        return next;
      });

      setLocalFormSchema(updatedSchema);

      setSaveStatus("saving");
      const currentValues = form.getValues();
      autosaveMutation.mutate({
        formSchema: updatedSchema,
        responseData: currentValues,
      });
    },
    [localFormSchema, form, autosaveMutation],
  );

  const handleDeleteSection = useCallback(
    (sectionId: string) => {
      const target = localFormSchema.find((s) => s.id === sectionId);
      if (!target) return;

      const updatedSchema = localFormSchema.filter(
        (section) => section.id !== sectionId,
      );

      setLocalFormSchema(updatedSchema);

      const currentValues = { ...form.getValues() };
      for (const field of target.fields) {
        const key = buildIntakeFieldKey(target.templateNamespace, field.id);
        if (key in currentValues) {
          delete currentValues[key];
          form.unregister(key);
        }
      }

      setSaveStatus("saving");
      autosaveMutation.mutate({
        formSchema: updatedSchema,
        responseData: currentValues,
      });
    },
    [localFormSchema, form, autosaveMutation],
  );

  const handleMoveSection = useCallback(
    (sectionId: string, direction: "up" | "down") => {
      const index = localFormSchema.findIndex((s) => s.id === sectionId);
      if (index === -1) return;
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= localFormSchema.length) return;

      const updatedSchema = [...localFormSchema];
      [updatedSchema[index], updatedSchema[swapWith]] = [
        updatedSchema[swapWith],
        updatedSchema[index],
      ];

      setLocalFormSchema(updatedSchema);

      setSaveStatus("saving");
      const currentValues = form.getValues();
      autosaveMutation.mutate({
        formSchema: updatedSchema,
        responseData: currentValues,
      });
    },
    [localFormSchema, form, autosaveMutation],
  );

  const handleMoveField = useCallback(
    (sectionId: string, fieldId: string, direction: "up" | "down") => {
      const sectionIndex = localFormSchema.findIndex(
        (s) => s.id === sectionId,
      );
      if (sectionIndex === -1) return;
      const section = localFormSchema[sectionIndex];
      const fieldIndex = section.fields.findIndex((f) => f.id === fieldId);
      if (fieldIndex === -1) return;
      const swapWith = direction === "up" ? fieldIndex - 1 : fieldIndex + 1;
      if (swapWith < 0 || swapWith >= section.fields.length) return;

      const updatedFields = [...section.fields];
      [updatedFields[fieldIndex], updatedFields[swapWith]] = [
        updatedFields[swapWith],
        updatedFields[fieldIndex],
      ];

      const updatedSchema = localFormSchema.map((s, i) =>
        i === sectionIndex ? { ...s, fields: updatedFields } : s,
      );

      setLocalFormSchema(updatedSchema);

      setSaveStatus("saving");
      const currentValues = form.getValues();
      autosaveMutation.mutate({
        formSchema: updatedSchema,
        responseData: currentValues,
      });
    },
    [localFormSchema, form, autosaveMutation],
  );

  return (
    <div className="space-y-4 " data-testid="intake-draft-form">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="font-semibold">{intake.templateName}</h3>
            <p className="text-sm text-muted-foreground">
              Started{" "}
              {intake.createdAt
                ? format(new Date(intake.createdAt), "MMM d, yyyy")
                : "recently"}
              {intake.createdBy &&
                ` by ${intake.createdBy.firstName} ${intake.createdBy.lastName}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <SaveStatusIndicator status={saveStatus} />
          {canWrite && (
            <div className="flex items-center gap-2">
              <SyncToDealButton
                dealId={dealId}
                intake={intake}
                canWrite={canWrite}
                config={config}
              />
              {canSaveToGoogleDrive && onSaveToGoogleDrive && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onSaveToGoogleDrive}
                  data-testid="button-save-intake-to-drive"
                >
                  <CloudUpload className="h-4 w-4" />
                  Save to Google Drive
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid="button-intake-more"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => setShowDeleteDialog(true)}
                    data-testid="menuitem-reset-intake"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {config.resetMenuLabel}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      <Form {...form}>
        <div className="space-y-4">
          <FormFieldRenderer
            schema={localFormSchema}
            form={form as never}
            showCopyToken
            onAddField={
              canWrite && intake.status === "draft" ? handleAddField : undefined
            }
            onDeleteField={
              canWrite && intake.status === "draft"
                ? handleDeleteField
                : undefined
            }
            onAddSection={
              canWrite && intake.status === "draft"
                ? handleAddSection
                : undefined
            }
            onDeleteSection={
              canWrite && intake.status === "draft"
                ? handleDeleteSection
                : undefined
            }
            onEditSection={
              canWrite && intake.status === "draft"
                ? handleEditSection
                : undefined
            }
            onMoveSection={
              canWrite && intake.status === "draft"
                ? handleMoveSection
                : undefined
            }
            onMoveField={
              canWrite && intake.status === "draft"
                ? handleMoveField
                : undefined
            }
            onMergeTemplate={canMerge ? () => setShowMergeDialog(true) : undefined}
          />
        </div>
      </Form>

      <Dialog
        open={showMergeDialog}
        onOpenChange={(open) => {
          setShowMergeDialog(open);
          if (!open) setSelectedMergeIds(new Set());
        }}
      >
        <DialogContent data-testid="dialog-merge-template">
          <DialogHeader>
            <DialogTitle>Add from template</DialogTitle>
            <DialogDescription>
              {config.mergeDialogDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {mergeTemplateOptions.length === 0 ? (
              <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                {config.noMergeTemplatesMessage}
              </div>
            ) : (
              <ScrollArea className="h-72 rounded-md border">
                <TooltipProvider delayDuration={200}>
                  <div className="p-1">
                    {mergeTemplateOptions.map(
                      ({ template: t, alreadyMerged }) => {
                        const checked = selectedMergeIds.has(t.id);
                        const row = (
                          <label
                            key={t.id}
                            htmlFor={`merge-template-${t.id}`}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-md p-3",
                              alreadyMerged
                                ? "cursor-not-allowed opacity-60"
                                : "hover-elevate",
                            )}
                            data-testid={`option-merge-template-${t.id}`}
                            data-already-merged={
                              alreadyMerged ? "true" : "false"
                            }
                          >
                            <Checkbox
                              id={`merge-template-${t.id}`}
                              checked={checked}
                              disabled={alreadyMerged}
                              onCheckedChange={(value) => {
                                setSelectedMergeIds((prev) => {
                                  const next = new Set(prev);
                                  if (value === true) {
                                    next.add(t.id);
                                  } else {
                                    next.delete(t.id);
                                  }
                                  return next;
                                });
                              }}
                              data-testid={`checkbox-merge-template-${t.id}`}
                            />
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="flex items-center gap-2 text-sm font-medium">
                                <span className="truncate">{t.name}</span>
                                <span className="text-xs font-normal text-muted-foreground">
                                  ({t.namespace})
                                </span>
                              </span>
                              {t.description && (
                                <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                  {t.description}
                                </span>
                              )}
                            </div>
                          </label>
                        );
                        if (!alreadyMerged) return row;
                        return (
                          <Tooltip key={t.id}>
                            <TooltipTrigger asChild>
                              <div>{row}</div>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              {`Already merged into this ${config.kind === "discovery" ? "discovery" : "intake"}`}
                            </TooltipContent>
                          </Tooltip>
                        );
                      },
                    )}
                  </div>
                </TooltipProvider>
              </ScrollArea>
            )}
            {selectedMergeIds.size > 0 && (
              <p
                className="text-xs text-muted-foreground"
                data-testid="text-merge-template-count"
              >
                {selectedMergeIds.size} template
                {selectedMergeIds.size === 1 ? "" : "s"} selected
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowMergeDialog(false)}
              data-testid="button-cancel-merge-template"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedMergeIds.size === 0) return;
                mergeMutation.mutate(Array.from(selectedMergeIds));
              }}
              disabled={
                selectedMergeIds.size === 0 || mergeMutation.isPending
              }
              data-testid="button-confirm-merge-template"
            >
              {mergeMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Add{" "}
              {selectedMergeIds.size > 1
                ? `${selectedMergeIds.size} templates`
                : "template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{config.removeDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {config.removeDialogDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-intake">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-intake"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function hasMappedFieldsWithData(
  formSchema: FormSection[],
  responseData: Record<string, unknown>,
): boolean {
  for (const section of formSchema) {
    for (const field of section.fields) {
      if (
        field.entityMapping?.entityType === "deal" &&
        field.entityMapping?.propertyKey
      ) {
        const value =
          responseData[buildIntakeFieldKey(section.templateNamespace, field.id)];
        if (value !== undefined && value !== null && value !== "") {
          if (Array.isArray(value) && value.length === 0) continue;
          if (
            typeof value === "object" &&
            !Array.isArray(value) &&
            Object.keys(value as object).length === 0
          )
            continue;
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
      return value
        .map((v: { displayName: string }) => v.displayName)
        .join(", ");
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

function SyncToDealButton({
  dealId,
  intake,
  canWrite,
  config,
}: {
  dealId: string;
  intake: DealIntakeWithRelations;
  canWrite: boolean;
  config: IntakeKindConfig;
}) {
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
      const res = await apiRequest("POST", `/api/deals/${dealId}/${config.endpoint}/sync`, {
        dryRun: true,
      });
      const data = await res.json();
      setSyncChanges(data.changes || []);
      setShowSyncDialog(true);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Failed to preview sync",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/deals/${dealId}/${config.endpoint}/sync`, {
        dryRun: false,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId] });
      queryClient.invalidateQueries({
        queryKey: ["/api/deals", dealId, "tags"],
      });
      setShowSyncDialog(false);
      toast({
        title: "Deal synced",
        description: `Deal properties have been updated from ${config.kind === "discovery" ? "discovery" : "intake"} data.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to sync",
        description: error.message,
      });
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
            <AlertDialogTitle>
              {config.kind === "discovery" ? "Sync Discovery to Deal" : "Sync Intake to Deal"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {`The following deal properties will be updated from the ${
                config.kind === "discovery" ? "discovery" : "intake"
              } responses. Existing values will be overwritten.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {syncChanges.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No data to sync. Fields are either empty or have no mapped values.
            </p>
          ) : (
            <div className="max-h-[300px] overflow-auto space-y-3 py-2">
              {syncChanges.map((change) => (
                <div
                  key={change.propertyKey}
                  className="border rounded-md p-3 space-y-1"
                  data-testid={`sync-change-${change.propertyKey}`}
                >
                  <p className="text-sm font-medium">{change.label}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Current:</span>
                      <p className="truncate">
                        {formatSyncValue(change.currentValue)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">New:</span>
                      <p className="truncate">
                        {formatSyncValue(change.newValue)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-sync">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || syncChanges.length === 0}
              data-testid="button-confirm-sync"
            >
              {syncMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Apply Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function DealIntakeTab({
  dealId,
  canWrite,
  onSaveToGoogleDrive,
  canSaveToGoogleDrive,
  kind = "intake",
}: DealIntakeTabProps) {
  const config = getIntakeKindConfig(kind);
  const { data: intake, isLoading } = useQuery<DealIntakeWithRelations | null>({
    queryKey: ["/api/deals", dealId, config.endpoint],
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
    return <IntakeEmptyState dealId={dealId} canWrite={canWrite} config={config} />;
  }

  return (
    <IntakeDraftForm
      dealId={dealId}
      intake={intake}
      canWrite={canWrite}
      onSaveToGoogleDrive={onSaveToGoogleDrive}
      canSaveToGoogleDrive={canSaveToGoogleDrive}
      config={config}
    />
  );
}
