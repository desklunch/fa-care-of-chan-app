import { useState, useCallback, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleFadingPlus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import * as LucideIcons from "lucide-react";
import type { ManagePageProps, ManageSectionConfig, FormFieldConfig } from "./types";

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const IconComponent = icons[name];
  if (!IconComponent) {
    return <LucideIcons.HelpCircle className={className} />;
  }
  return <IconComponent className={className} />;
}

interface FormDialogProps<T extends { id: string }> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: T | null;
  config: ManageSectionConfig<T>;
}

function FormDialog<T extends { id: string }>({ 
  open, 
  onOpenChange, 
  item, 
  config 
}: FormDialogProps<T>) {
  const { toast } = useToast();
  const isEditing = !!item;

  const form = useForm({
    resolver: zodResolver(config.formSchema),
    defaultValues: config.getDefaultValues(item),
  });

  useEffect(() => {
    if (open) {
      form.reset(config.getDefaultValues(item));
    }
  }, [open, item, form, config]);

  const createMutation = useMutation({
    mutationFn: async (data: unknown) => {
      return apiRequest("POST", config.createEndpoint, data);
    },
    onSuccess: () => {
      config.invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      toast({ title: `${config.entityName} created successfully` });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: `Failed to create ${config.entityName.toLowerCase()}`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: unknown) => {
      return apiRequest("PATCH", config.updateEndpoint(item!.id), data);
    },
    onSuccess: () => {
      config.invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      toast({ title: `${config.entityName} updated successfully` });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: `Failed to update ${config.entityName.toLowerCase()}`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", config.deleteEndpoint(item!.id));
    },
    onSuccess: () => {
      config.invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      toast({ title: `${config.entityName} deleted successfully` });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: `Failed to delete ${config.entityName.toLowerCase()}`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: unknown) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const renderField = (fieldConfig: FormFieldConfig) => {
    return (
      <FormField
        key={fieldConfig.name}
        control={form.control}
        name={fieldConfig.name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{fieldConfig.label}</FormLabel>
            <FormControl>
              {fieldConfig.type === "textarea" ? (
                <Textarea
                  placeholder={fieldConfig.placeholder}
                  {...field}
                  value={field.value as string || ""}
                  data-testid={`input-${fieldConfig.name}`}
                />
              ) : fieldConfig.type === "select" ? (
                <Select onValueChange={field.onChange} value={field.value as string || ""}>
                  <SelectTrigger data-testid={`select-${fieldConfig.name}`}>
                    <SelectValue placeholder={fieldConfig.placeholder || "Select..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldConfig.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : fieldConfig.type === "icon" ? (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={fieldConfig.placeholder}
                    {...field}
                    value={String(field.value ?? "")}
                    data-testid={`input-${fieldConfig.name}`}
                  />
                  {field.value ? (
                    <div className="flex items-center justify-center w-10 h-10 border rounded-md bg-muted">
                      <DynamicIcon name={String(field.value)} className="w-5 h-5" />
                    </div>
                  ) : null}
                </div>
              ) : (
                <Input
                  placeholder={fieldConfig.placeholder}
                  {...field}
                  value={field.value as string || ""}
                  data-testid={`input-${fieldConfig.name}`}
                />
              )}
            </FormControl>
            {fieldConfig.description && (
              <FormDescription>{fieldConfig.description}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? config.editDialogTitle : config.createDialogTitle}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? config.editDialogDescription : config.createDialogDescription}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {config.formFields.map(renderField)}
            <DialogFooter className="pt-6 gap-2">
              {isEditing && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={isPending}
                      data-testid="button-delete"
                      className="mr-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {config.entityName}</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this {config.entityName.toLowerCase()}? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit">
                {isPending ? "Saving..." : isEditing ? "Save Changes" : `Create ${config.entityName}`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface SectionContentProps<T extends { id: string }> {
  config: ManageSectionConfig<T>;
  onCreateClick: () => void;
  onRowClick: (item: T) => void;
}

function SectionContent<T extends { id: string }>({ 
  config, 
  onCreateClick, 
  onRowClick 
}: SectionContentProps<T>) {
  const dataGridProps = {
    queryKey: config.queryKey,
    columns: config.columns,
    defaultVisibleColumns: config.defaultVisibleColumns,
    searchFields: config.searchFields,
    searchPlaceholder: config.searchPlaceholder,
    onRowClick,
    getRowId: config.getRowId,
    emptyMessage: config.emptyMessage,
    emptyDescription: config.emptyDescription,
    filters: config.filters,
  };

  return <DataGridPage {...dataGridProps} />;
}

export function ManagePage({ title, sections, breadcrumbs = [] }: ManagePageProps) {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  
  const searchParams = new URLSearchParams(searchString);
  const tabFromUrl = searchParams.get("tab");
  const defaultTab = sections[0]?.id || "";
  const isValidTab = (tab: string | null): tab is string => 
    tab !== null && sections.some(s => s.id === tab);
  const [activeTab, setActiveTab] = useState(isValidTab(tabFromUrl) ? tabFromUrl : defaultTab);
  
  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (isValidTab(currentTab)) {
      if (currentTab !== activeTab) {
        setActiveTab(currentTab);
      }
    } else if (currentTab !== null && activeTab !== defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [searchString, sections, defaultTab]);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string } | null>(null);

  const activeSection = sections.find(s => s.id === activeTab) || sections[0];

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchString);
    newParams.set("tab", tab);
    navigate(`?${newParams.toString()}`, { replace: true });
  };

  const handleRowClick = useCallback((item: { id: string }) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
  }, []);

  const handleCreateClick = useCallback(() => {
    setCreateDialogOpen(true);
  }, []);

  if (isAuthLoading) {
    return (
      <PageLayout breadcrumbs={breadcrumbs.length > 0 ? breadcrumbs : [{ label: title }]}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded w-64" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  return (
    <PageLayout
      breadcrumbs={breadcrumbs.length > 0 ? breadcrumbs : [{ label: title }]}
      primaryAction={{
        label: `New ${activeSection?.entityName || "Item"}`,
        onClick: handleCreateClick,
        icon: CircleFadingPlus,
        variant: "default",
      }}
    >
      <div className="flex flex-col h-full">
        <div className="border-b px-4 py-2">
          <ScrollArea className="w-full">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="inline-flex h-9 w-auto">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <TabsTrigger
                      key={section.id}
                      value={section.id}
                      className="gap-2 px-4"
                      data-testid={`tab-${section.id}`}
                    >
                      <Icon className="h-4 w-4" />
                      {section.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeSection && (
            <SectionContent
              config={activeSection}
              onCreateClick={handleCreateClick}
              onRowClick={handleRowClick}
            />
          )}
        </div>
      </div>

      {activeSection && (
        <>
          <FormDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            config={activeSection}
          />

          <FormDialog
            open={editDialogOpen}
            onOpenChange={(open) => {
              setEditDialogOpen(open);
              if (!open) setSelectedItem(null);
            }}
            item={selectedItem}
            config={activeSection}
          />
        </>
      )}
    </PageLayout>
  );
}
