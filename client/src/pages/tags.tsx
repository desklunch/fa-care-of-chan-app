import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Tag } from "@shared/schema";
import type { ColumnConfig, FilterConfig } from "@/components/data-grid/types";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CircleFadingPlus, Tag as TagIcon, Folder } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DEFAULT_VISIBLE_COLUMNS = ["name", "category"];

const tagFilters: FilterConfig<Tag>[] = [
  {
    id: "category",
    label: "Category",
    icon: Folder,
    optionSource: {
      type: "deriveFromData",
      deriveOptions: (data) => {
        const categories = new Set<string>();
        data.forEach((tag) => {
          if (tag.category) {
            categories.add(tag.category);
          }
        });
        return Array.from(categories)
          .sort()
          .map((cat) => ({ id: cat, label: cat }));
      },
    },
    matchFn: (tag, selectedValues) => {
      if (!tag.category) return false;
      return selectedValues.includes(tag.category);
    },
  },
];

const tagFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  category: z.string().min(1, "Category is required").max(100),
});

type TagFormData = z.infer<typeof tagFormSchema>;

function NameCellRenderer({ data }: { data: Tag }) {
  if (!data) return null;
  return (
    <div className="flex items-center gap-2 h-full">
      <TagIcon className="w-4 h-4 text-muted-foreground" />
      <span className="font-medium truncate" data-testid={`text-tag-name-${data.id}`}>
        {data.name}
      </span>
    </div>
  );
}

function CategoryCellRenderer({ data }: { data: Tag }) {
  if (!data?.category) return null;
  return (
    <Badge variant="secondary" className="truncate">
      {data.category}
    </Badge>
  );
}

interface TagFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag?: Tag | null;
  onSuccess: () => void;
}

function TagFormDialog({ open, onOpenChange, tag, onSuccess }: TagFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!tag;

  const form = useForm<TagFormData>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: {
      name: tag?.name || "",
      category: tag?.category || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: tag?.name || "",
        category: tag?.category || "",
      });
    }
  }, [open, tag, form]);

  const createMutation = useMutation({
    mutationFn: async (data: TagFormData) => {
      return apiRequest("POST", "/api/tags", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({ title: "Tag created successfully" });
      onSuccess();
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TagFormData) => {
      return apiRequest("PATCH", `/api/tags/${tag!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({ title: "Tag updated successfully" });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TagFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Tag" : "New Tag"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the tag details below."
              : "Add a new tag that can be assigned to venues."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Outdoor, Pet-Friendly, Vegan Options"
                      {...field}
                      data-testid="input-tag-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Features, Dining, Accessibility"
                      {...field}
                      data-testid="input-tag-category"
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
                disabled={isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit">
                {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Tag"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function TagsPage() {
  const [, navigate] = useLocation();
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

  const isAdmin = user?.role === "admin";

  const handleRowClick = useCallback((tag: Tag) => {
    if (isAdmin) {
      setSelectedTag(tag);
      setEditDialogOpen(true);
    }
  }, [isAdmin]);

  const tagColumns: ColumnConfig<Tag>[] = [
    {
      id: "name",
      headerName: "Name",
      field: "name",
      category: "Basic Info",
      colDef: {
        flex: 1,
        minWidth: 150,
        cellRenderer: (params: { data: Tag }) => <NameCellRenderer data={params.data} />,
      },
    },
    {
      id: "category",
      headerName: "Category",
      field: "category",
      category: "Basic Info",
      colDef: {
        flex: 1,
        minWidth: 150,
        cellRenderer: (params: { data: Tag }) => <CategoryCellRenderer data={params.data} />,
      },
    },
  ];

  const dataGridProps = {
    queryKey: "/api/tags",
    columns: tagColumns,
    defaultVisibleColumns: DEFAULT_VISIBLE_COLUMNS,
    searchFields: ["name", "category"] as (keyof Tag)[],
    searchPlaceholder: "Search tags...",
    onRowClick: handleRowClick,
    getRowId: (tag: Tag) => tag.id,
    emptyMessage: "No tags yet",
    emptyDescription: "Create your first tag to get started.",
    filters: tagFilters,
  };

  if (isAuthLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Tags" }]}>
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
      breadcrumbs={[{ label: "Tags" }]}
      primaryAction={
        isAdmin
          ? {
              label: "New Tag",
              onClick: () => setCreateDialogOpen(true),
              icon: CircleFadingPlus,
              variant: "default",
            }
          : undefined
      }
    >
      <DataGridPage {...dataGridProps} />

      <TagFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {}}
      />

      <TagFormDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setSelectedTag(null);
        }}
        tag={selectedTag}
        onSuccess={() => {}}
      />
    </PageLayout>
  );
}
