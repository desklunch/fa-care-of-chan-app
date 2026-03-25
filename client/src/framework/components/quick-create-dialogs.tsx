import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { IssueSeverity, FeatureCategory, FeatureType, CreateAppIssue, CreateAppFeature } from "@shared/schema";
import { issueSeverities, featureTypes, insertAppIssueSchema, insertAppFeatureSchema } from "@shared/schema";

interface QuickCreateContextValue {
  openIssueDialog: () => void;
  openFeatureDialog: () => void;
}

const QuickCreateContext = createContext<QuickCreateContextValue | undefined>(undefined);

export function useQuickCreate() {
  const context = useContext(QuickCreateContext);
  if (context === undefined) {
    throw new Error("useQuickCreate must be used within a QuickCreateProvider");
  }
  return context;
}

const severityLabels: Record<IssueSeverity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const severityIcons: Record<IssueSeverity, typeof AlertCircle> = {
  high: AlertCircle,
  medium: AlertTriangle,
  low: Info,
};

const featureTypeLabels: Record<FeatureType, string> = {
  idea: "Idea",
  requirement: "Requirement",
};

function ReportIssueDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();

  const form = useForm<CreateAppIssue>({
    resolver: zodResolver(insertAppIssueSchema),
    defaultValues: {
      title: "",
      severity: "medium",
      description: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateAppIssue) => {
      return apiRequest("POST", "/api/app-issues", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-issues"] });
      toast({ title: "Issue reported successfully!" });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to report issue",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = (data: CreateAppIssue) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-quick-report-issue">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title-issue">Report Issue</DialogTitle>
          <DialogDescription>Quickly report a bug or problem you've encountered.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief description of the issue"
                      {...field}
                      data-testid="input-quick-issue-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Severity</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-quick-issue-severity">
                        <SelectValue placeholder="Select severity level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {issueSeverities.map((severity) => {
                        const Icon = severityIcons[severity];
                        return (
                          <SelectItem key={severity} value={severity} data-testid={`select-option-quick-severity-${severity}`}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span>{severityLabels[severity]}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the issue in detail..."
                      className="min-h-[100px]"
                      {...field}
                      data-testid="textarea-quick-issue-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
                data-testid="button-cancel-quick-issue"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-submit-quick-issue"
              >
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Report
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function RequestFeatureDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();

  const { data: categories = [] } = useQuery<FeatureCategory[]>({
    queryKey: ["/api/categories"],
    enabled: open,
  });

  const form = useForm<CreateAppFeature>({
    resolver: zodResolver(insertAppFeatureSchema),
    defaultValues: {
      title: "",
      featureType: undefined,
      categoryId: "",
      description: "",
      status: "proposed",
      sortOrder: 0,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateAppFeature) => {
      return apiRequest("POST", "/api/features", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      toast({ title: "Feature request submitted!" });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit feature request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = (data: CreateAppFeature) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-quick-request-feature">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title-feature">Request Feature</DialogTitle>
          <DialogDescription>Submit a new idea or feature requirement.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief summary of your idea"
                      {...field}
                      data-testid="input-quick-feature-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="featureType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-quick-feature-type">
                        <SelectValue placeholder="Idea or Requirement?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {featureTypes.map((type) => (
                        <SelectItem key={type} value={type} data-testid={`select-option-quick-type-${type}`}>
                          {featureTypeLabels[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-quick-feature-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} data-testid={`select-option-quick-category-${cat.id}`}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your feature request..."
                      className="min-h-[100px]"
                      {...field}
                      data-testid="textarea-quick-feature-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
                data-testid="button-cancel-quick-feature"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-submit-quick-feature"
              >
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface QuickCreateProviderProps {
  children: ReactNode;
}

export function QuickCreateProvider({ children }: QuickCreateProviderProps) {
  const [issueOpen, setIssueOpen] = useState(false);
  const [featureOpen, setFeatureOpen] = useState(false);

  const openIssueDialog = useCallback(() => setIssueOpen(true), []);
  const openFeatureDialog = useCallback(() => setFeatureOpen(true), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable) {
        return;
      }

      if (e.key === "i" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        setIssueOpen((prev) => !prev);
      }

      if (e.key === "F" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setFeatureOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <QuickCreateContext.Provider value={{ openIssueDialog, openFeatureDialog }}>
      {children}
      <ReportIssueDialog open={issueOpen} onOpenChange={setIssueOpen} />
      <RequestFeatureDialog open={featureOpen} onOpenChange={setFeatureOpen} />
    </QuickCreateContext.Provider>
  );
}
