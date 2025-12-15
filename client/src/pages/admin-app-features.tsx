import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { CircleFadingPlus, Edit2, Tags, GripVertical } from "lucide-react";
import type { FeatureCategory } from "@shared/schema";
import { insertFeatureCategorySchema, updateFeatureCategorySchema } from "@shared/schema";
import { z } from "zod";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const createFormSchema = insertFeatureCategorySchema;
type CreateFormData = z.infer<typeof createFormSchema>;

const editFormSchema = updateFeatureCategorySchema;
type EditFormData = z.infer<typeof editFormSchema>;

function SortableCategoryItem({ 
  category, 
  onEdit 
}: { 
  category: FeatureCategory; 
  onEdit: (category: FeatureCategory) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} data-testid={`sortable-category-${category.id}`}>
      <Card 
        className={`${isDragging ? 'shadow-lg ring-2 ring-primary' : 'hover-elevate'}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded"
              data-testid={`drag-handle-${category.id}`}
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>
            <div 
              className="w-4 h-4 rounded-full shrink-0" 
              style={{ backgroundColor: category.color || '#6B7280' }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate" data-testid={`text-category-name-${category.id}`}>
                  {category.name}
                </span>
                {!category.isActive && (
                  <Badge variant="secondary" className="shrink-0">Inactive</Badge>
                )}
              </div>
              {category.description && (
                <p className="text-sm text-muted-foreground truncate mt-0.5" data-testid={`text-category-description-${category.id}`}>
                  {category.description}
                </p>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onEdit(category)}
              data-testid={`button-edit-category-${category.id}`}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateCategoryDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateFormData>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3B82F6",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateFormData) => {
      return apiRequest("POST", "/api/admin/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Category created!" });
      form.reset();
      setOpen(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create category", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: CreateFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-new-category">
          <CircleFadingPlus className="h-4 w-4 mr-2" />
          New Category
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Category</DialogTitle>
          <DialogDescription>
            Create a new category for organizing feature requests.
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
                      placeholder="e.g., UI/UX, Performance, Integration" 
                      {...field} 
                      data-testid="input-category-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="color"
                        className="w-12 h-10 p-1 cursor-pointer"
                        {...field} 
                        value={field.value || "#3B82F6"}
                        data-testid="input-category-color"
                      />
                      <Input 
                        placeholder="#3B82F6"
                        {...field}
                        value={field.value || ""}
                        className="flex-1"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of this category..."
                      {...field} 
                      value={field.value || ""}
                      data-testid="textarea-category-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription className="text-sm">
                      Inactive categories can't be used for new features
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-category-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                data-testid="button-cancel-category"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                data-testid="button-submit-category"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditCategoryDialog({ 
  category, 
  open, 
  onOpenChange,
  onSuccess 
}: { 
  category: FeatureCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();

  const form = useForm<EditFormData>({
    resolver: zodResolver(editFormSchema),
    values: category ? {
      name: category.name,
      description: category.description || "",
      color: category.color || "#3B82F6",
      isActive: category.isActive,
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EditFormData) => {
      return apiRequest("PATCH", `/api/admin/categories/${category?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Category updated!" });
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update category", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: EditFormData) => {
    updateMutation.mutate(data);
  };

  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Update category settings.
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
                      {...field} 
                      value={field.value || ""}
                      data-testid="input-edit-category-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="color"
                        className="w-12 h-10 p-1 cursor-pointer"
                        {...field} 
                        value={field.value || "#3B82F6"}
                        data-testid="input-edit-category-color"
                      />
                      <Input 
                        {...field}
                        value={field.value || ""}
                        className="flex-1"
                      />
                    </div>
                  </FormControl>
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
                      {...field} 
                      value={field.value || ""}
                      data-testid="textarea-edit-category-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription className="text-sm">
                      Inactive categories can't be used for new features
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-edit-category-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-edit-category"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
                data-testid="button-save-category"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminAppFeatures() {
  usePageTitle("Feature Categories");
  const [editingCategory, setEditingCategory] = useState<FeatureCategory | null>(null);
  const { toast } = useToast();

  const { data: categories = [], isLoading } = useQuery<FeatureCategory[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories?includeInactive=true");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      return apiRequest("PUT", "/api/admin/categories/order", { orderedIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update order", 
        description: error.message,
        variant: "destructive" 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat.id === active.id);
      const newIndex = categories.findIndex((cat) => cat.id === over.id);
      
      const newOrder = arrayMove(categories, oldIndex, newIndex);
      const orderedIds = newOrder.map((cat) => cat.id);
      
      queryClient.setQueryData(["/api/categories"], newOrder);
      
      reorderMutation.mutate(orderedIds);
    }
  }

  if (isLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Admin" }, { label: "App Features" }]}>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="space-y-3 max-w-2xl">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout breadcrumbs={[{ label: "Admin" }, { label: "App Features" }]}>
      <div className="p-4 md:p-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Feature Categories</h1>
          <p className="text-sm text-muted-foreground">
            Drag and drop to reorder categories. This order will be used on the features page.
          </p>
        </div>

        <div className="flex justify-end">
          <CreateCategoryDialog onSuccess={() => {}} />
        </div>

        {categories.length === 0 ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Tags className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No categories yet</h3>
              <p className="text-muted-foreground mb-4">
                Create categories to organize feature requests.
              </p>
              <CreateCategoryDialog onSuccess={() => {}} />
            </div>
          </Card>
        ) : (
          <div className="max-w-2xl space-y-3" data-testid="category-list">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={categories.map((cat) => cat.id)}
                strategy={verticalListSortingStrategy}
              >
                {categories.map((category) => (
                  <SortableCategoryItem 
                    key={category.id} 
                    category={category} 
                    onEdit={setEditingCategory}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        <EditCategoryDialog
          category={editingCategory}
          open={!!editingCategory}
          onOpenChange={(open) => !open && setEditingCategory(null)}
          onSuccess={() => setEditingCategory(null)}
        />
      </div>
    </PageLayout>
  );
}
