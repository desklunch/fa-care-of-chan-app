import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  FORM_TEMPLATE_NAMESPACE_REGEX,
  RESERVED_FORM_TEMPLATE_NAMESPACE,
  type FormTemplate,
} from "@shared/schema";

function slugifyNamespace(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface DuplicateTemplateDialogProps {
  template: FormTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDuplicated?: (template: FormTemplate) => void;
}

export function DuplicateTemplateDialog({
  template,
  open,
  onOpenChange,
  onDuplicated,
}: DuplicateTemplateDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [namespace, setNamespace] = useState("");
  const [namespaceTouched, setNamespaceTouched] = useState(false);

  const { data: existingTemplates = [] } = useQuery<FormTemplate[]>({
    queryKey: ["/api/form-templates"],
    enabled: open,
  });

  useEffect(() => {
    if (open && template) {
      const baseName = `${template.name} (Copy)`;
      setName(baseName);
      setNamespace(slugifyNamespace(baseName));
      setNamespaceTouched(false);
    }
  }, [open, template]);

  const trimmedNamespace = namespace.trim();
  const namespaceError = useMemo(() => {
    if (!trimmedNamespace) return null;
    if (!FORM_TEMPLATE_NAMESPACE_REGEX.test(trimmedNamespace)) {
      return "Use lowercase letters, numbers, and hyphens (e.g. event-production).";
    }
    if (trimmedNamespace === RESERVED_FORM_TEMPLATE_NAMESPACE) {
      return `"${RESERVED_FORM_TEMPLATE_NAMESPACE}" is reserved and cannot be used.`;
    }
    if (
      existingTemplates.some(
        (t) => t.namespace === trimmedNamespace && t.id !== template?.id,
      )
    ) {
      return `Namespace "${trimmedNamespace}" is already in use by another template.`;
    }
    return null;
  }, [trimmedNamespace, existingTemplates, template?.id]);

  const mutation = useMutation({
    mutationFn: async (data: { name: string; namespace: string }) => {
      if (!template) throw new Error("No template selected");
      const res = await apiRequest(
        "POST",
        `/api/form-templates/${template.id}/duplicate`,
        data,
      );
      return (await res.json()) as FormTemplate;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      toast({
        title: "Template duplicated",
        description: `Created "${created.name}".`,
      });
      onOpenChange(false);
      onDuplicated?.(created);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          variant: "destructive",
          title: "Session expired",
          description: "Please log in again.",
        });
        return;
      }
      let description = "Failed to duplicate template.";
      try {
        const message = error?.message ?? "";
        const match = message.match(/^\d{3}:\s*([\s\S]*)$/);
        if (match) {
          const parsed = JSON.parse(match[1]);
          if (parsed?.message) description = parsed.message;
        }
      } catch {
        // keep default
      }
      toast({ variant: "destructive", title: "Error", description });
    },
  });

  const handleConfirm = () => {
    const trimmedName = name.trim();
    const trimmedNs = namespace.trim();
    if (!trimmedName) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Name is required.",
      });
      return;
    }
    if (!trimmedNs) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Namespace is required.",
      });
      return;
    }
    if (!FORM_TEMPLATE_NAMESPACE_REGEX.test(trimmedNs)) {
      toast({
        variant: "destructive",
        title: "Invalid namespace",
        description: "Use lowercase letters, numbers, and hyphens (e.g. event-production).",
      });
      return;
    }
    if (trimmedNs === RESERVED_FORM_TEMPLATE_NAMESPACE) {
      toast({
        variant: "destructive",
        title: "Reserved namespace",
        description: `"${RESERVED_FORM_TEMPLATE_NAMESPACE}" is reserved and cannot be used.`,
      });
      return;
    }
    if (namespaceError) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: namespaceError,
      });
      return;
    }
    mutation.mutate({ name: trimmedName, namespace: trimmedNs });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate Template</DialogTitle>
          <DialogDescription>
            Choose a name and a unique namespace for the new template. The
            namespace cannot be changed later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="duplicate-template-name">Name</Label>
            <Input
              id="duplicate-template-name"
              value={name}
              onChange={(e) => {
                const next = e.target.value;
                setName(next);
                if (!namespaceTouched) {
                  setNamespace(slugifyNamespace(next));
                }
              }}
              data-testid="input-duplicate-template-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duplicate-template-namespace">Namespace</Label>
            <Input
              id="duplicate-template-namespace"
              value={namespace}
              onChange={(e) => {
                setNamespaceTouched(true);
                setNamespace(e.target.value);
              }}
              placeholder="e.g. event-production-copy"
              aria-invalid={!!namespaceError}
              data-testid="input-duplicate-template-namespace"
            />
            {namespaceError ? (
              <p
                className="text-xs text-destructive"
                data-testid="text-duplicate-template-namespace-error"
              >
                {namespaceError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-duplicate-template"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={mutation.isPending || !!namespaceError || !trimmedNamespace}
            data-testid="button-confirm-duplicate-template"
          >
            {mutation.isPending ? "Duplicating..." : "Duplicate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
