import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import type { Deal, DealStatus } from "@shared/schema";
import { dealStatuses } from "@shared/schema";

const dealFormSchema = z.object({
  displayName: z.string().min(1, "Name is required").max(255, "Name must be 255 characters or less"),
  status: z.enum(dealStatuses).default("Inquiry"),
});

type DealFormValues = z.infer<typeof dealFormSchema>;

export default function DealForm() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEditing = Boolean(id);

  const { data: deal, isLoading: isLoadingDeal } = useQuery<Deal>({
    queryKey: ["/api/deals", id],
    enabled: isEditing,
  });

  usePageTitle(isEditing ? (deal?.displayName ? `Edit ${deal.displayName}` : "Edit Deal") : "New Deal");

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      displayName: "",
      status: "Inquiry",
    },
  });

  useEffect(() => {
    if (deal && isEditing) {
      form.reset({
        displayName: deal.displayName,
        status: deal.status as DealStatus,
      });
    }
  }, [deal, isEditing, form]);

  const createMutation = useMutation({
    mutationFn: async (data: DealFormValues) => {
      const response = await apiRequest("POST", "/api/deals", data);
      return response.json();
    },
    onSuccess: (newDeal: Deal) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({ title: "Deal created successfully" });
      setLocation(`/deals/${newDeal.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create deal", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: DealFormValues) => {
      const response = await apiRequest("PATCH", `/api/deals/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", id] });
      toast({ title: "Deal updated successfully" });
      setLocation(`/deals/${id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update deal", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: DealFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEditing && isLoadingDeal) {
    return (
      <PageLayout breadcrumbs={[{ label: "Deals", href: "/deals" }, { label: "Loading..." }]}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Deals", href: "/deals" },
        ...(isEditing && deal ? [{ label: deal.displayName, href: `/deals/${id}` }] : []),
        { label: isEditing ? "Edit" : "New Deal" },
      ]}
    >
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Deal" : "Create New Deal"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter deal name..."
                          {...field}
                          data-testid="input-deal-name"
                        />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for this deal or opportunity.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-deal-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {dealStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The current stage of this deal in your pipeline.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={isPending}
                    data-testid="button-submit-deal"
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? "Update Deal" : "Create Deal"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation(isEditing ? `/deals/${id}` : "/deals")}
                    disabled={isPending}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
