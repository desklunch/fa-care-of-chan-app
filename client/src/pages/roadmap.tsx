import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, ThumbsUp, Filter, Lightbulb } from "lucide-react";
import { Link } from "wouter";
import type { ProductFeatureWithRelations, FeatureCategory, FeatureStatus, FeatureType } from "@shared/schema";
import { insertProductFeatureSchema, featureTypes } from "@shared/schema";
import { z } from "zod";

const featureTypeLabels: Record<FeatureType, string> = {
  idea: "Idea",
  requirement: "Requirement",
};

const featureTypeColors: Record<FeatureType, string> = {
  idea: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  requirement: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
};

const statusLabels: Record<FeatureStatus, string> = {
  idea: "Idea",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  archived: "Archived",
};

const statusColors: Record<FeatureStatus, string> = {
  idea: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  under_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  planned: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  in_progress: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const formSchema = insertProductFeatureSchema;
type FormData = z.infer<typeof formSchema>;

function FeatureCard({ 
  feature, 
  onVote,
  isVoting
}: { 
  feature: ProductFeatureWithRelations; 
  onVote: (id: string) => void;
  isVoting: boolean;
}) {
  const createdByName = [feature.createdBy.firstName, feature.createdBy.lastName]
    .filter(Boolean)
    .join(" ") || "Unknown";

  return (
    <Card className="hover-elevate" data-testid={`card-feature-${feature.id}`}>
      <Link href={`/roadmap/${feature.id}`}>
        <CardHeader className="pb-3 cursor-pointer">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-2" data-testid={`text-feature-title-${feature.id}`}>
                {feature.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {feature.featureType && (
                  <Badge 
                    className={featureTypeColors[feature.featureType as FeatureType]}
                    data-testid={`badge-type-${feature.id}`}
                  >
                    {featureTypeLabels[feature.featureType as FeatureType]}
                  </Badge>
                )}
                <Badge 
                  className={statusColors[feature.status as FeatureStatus]}
                  data-testid={`badge-status-${feature.id}`}
                >
                  {statusLabels[feature.status as FeatureStatus]}
                </Badge>
                <Badge 
                  variant="outline"
                  style={{ 
                    borderColor: feature.category.color || undefined,
                    color: feature.category.color || undefined 
                  }}
                  data-testid={`badge-category-${feature.id}`}
                >
                  {feature.category.name}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-3 cursor-pointer">
          <CardDescription className="line-clamp-3" data-testid={`text-feature-description-${feature.id}`}>
            {feature.description}
          </CardDescription>
        </CardContent>
      </Link>
      <CardFooter className="flex items-center justify-between gap-2 pt-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Avatar className="h-6 w-6">
            <AvatarImage src={feature.createdBy.profileImageUrl || undefined} />
            <AvatarFallback className="text-xs">
              {createdByName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate max-w-[100px]">{createdByName}</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={feature.hasVoted ? "default" : "outline"}
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onVote(feature.id);
            }}
            disabled={isVoting}
            className="gap-1"
            data-testid={`button-vote-${feature.id}`}
          >
            <ThumbsUp className="h-4 w-4" />
            <span data-testid={`text-vote-count-${feature.id}`}>{feature.voteCount}</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function CreateFeatureDialog({ 
  categories, 
  onSuccess 
}: { 
  categories: FeatureCategory[];
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryId: "",
      featureType: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/features", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      toast({ title: "Feature request submitted!" });
      form.reset();
      setOpen(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to submit feature", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-new-feature">
          <Plus className="h-4 w-4 mr-2" />
          New Feature Request
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit Feature Request</DialogTitle>
          <DialogDescription>
            Share your idea for improving the application. Others can vote and comment on it.
          </DialogDescription>
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
                      data-testid="input-feature-title"
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
                      <SelectTrigger data-testid="select-feature-type">
                        <SelectValue placeholder="Is this an Idea or a Requirement?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {featureTypes.map((type) => (
                        <SelectItem key={type} value={type}>
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
                      <SelectTrigger data-testid="select-feature-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
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
                      placeholder="Describe your feature request in detail..."
                      className="min-h-[120px]"
                      {...field} 
                      data-testid="textarea-feature-description"
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
                onClick={() => setOpen(false)}
                data-testid="button-cancel-feature"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                data-testid="button-submit-feature"
              >
                {createMutation.isPending ? "Submitting..." : "Submit"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Roadmap() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: features = [], isLoading: featuresLoading } = useQuery<ProductFeatureWithRelations[]>({
    queryKey: ["/api/features"],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<FeatureCategory[]>({
    queryKey: ["/api/categories"],
  });

  const voteMutation = useMutation({
    mutationFn: async (featureId: string) => {
      return apiRequest("POST", `/api/features/${featureId}/vote`);
    },
    onMutate: async (featureId: string) => {
      await queryClient.cancelQueries({ queryKey: ["/api/features"] });
      const previousFeatures = queryClient.getQueryData<ProductFeatureWithRelations[]>(["/api/features"]);
      if (previousFeatures) {
        queryClient.setQueryData<ProductFeatureWithRelations[]>(["/api/features"], 
          previousFeatures.map((f) =>
            f.id === featureId
              ? { ...f, voteCount: f.hasVoted ? f.voteCount - 1 : f.voteCount + 1, hasVoted: !f.hasVoted }
              : f
          )
        );
      }
      return { previousFeatures };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousFeatures) {
        queryClient.setQueryData(["/api/features"], context.previousFeatures);
      }
      toast({ 
        title: "Failed to vote", 
        description: error.message,
        variant: "destructive" 
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
    },
  });

  const filteredFeatures = features.filter((f) => {
    if (statusFilter !== "all" && f.status !== statusFilter) return false;
    if (categoryFilter !== "all" && f.categoryId !== categoryFilter) return false;
    return true;
  });

  // Group features by category
  const featuresByCategory = filteredFeatures.reduce((acc, feature) => {
    const categoryId = feature.categoryId;
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(feature);
    return acc;
  }, {} as Record<string, ProductFeatureWithRelations[]>);

  // Get ordered list of categories that have features
  const categoriesWithFeatures = categories.filter(
    (cat) => featuresByCategory[cat.id] && featuresByCategory[cat.id].length > 0
  );

  const isLoading = featuresLoading || categoriesLoading;

  if (isLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Roadmap" }]}>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout breadcrumbs={[{ label: "Roadmap" }]}>
      <div className="p-4 md:p-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Product Roadmap</h1>
          <p className="text-sm text-muted-foreground">
            Vote and comment on feature requests to shape the future of our application
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-category-filter">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CreateFeatureDialog categories={categories} onSuccess={() => {}} />
        </div>

        {filteredFeatures.length === 0 ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No feature requests yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to submit an idea for improving the application!
              </p>
              <CreateFeatureDialog categories={categories} onSuccess={() => {}} />
            </div>
          </Card>
        ) : (
          <div className="space-y-8">
            {categoriesWithFeatures.map((category) => (
              <div key={category.id} className="space-y-4" data-testid={`category-section-${category.id}`}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: category.color || '#6b7280' }}
                  />
                  <h2 className="text-lg font-semibold">{category.name}</h2>
                  <Badge variant="secondary" className="ml-2">
                    {featuresByCategory[category.id].length}
                  </Badge>
                </div>
                {category.description && (
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                )}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {featuresByCategory[category.id].map((feature) => (
                    <FeatureCard 
                      key={feature.id} 
                      feature={feature} 
                      onVote={(id) => voteMutation.mutate(id)}
                      isVoting={voteMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
