import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { usePermissions } from "@/hooks/usePermissions";
import { NoPermissionMessage } from "@/components/no-permission-message";
import { PageLayout } from "@/framework";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { DealStatusRecord } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Pencil, Loader2 } from "lucide-react";

const editDealStatusSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  winProbability: z.coerce.number().int().min(0).max(100),
  sortOrder: z.coerce.number().int(),
  colorLight: z.string().min(1, "Light color is required").max(100),
  colorDark: z.string().min(1, "Dark color is required").max(100),
  isActive: z.boolean(),
  isDefault: z.boolean(),
});

type EditDealStatusValues = z.infer<typeof editDealStatusSchema>;

function ColorSwatch({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-5 h-5 rounded-md border border-border"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm text-muted-foreground font-mono">{color}</span>
    </div>
  );
}

function ManageDealStatuses() {
  usePageTitle("Deal Statuses");
  const { can, isLoading: permLoading } = usePermissions();
  const { toast } = useToast();
  const [editingStatus, setEditingStatus] = useState<DealStatusRecord | null>(null);

  const { data: statuses = [], isLoading } = useQuery<DealStatusRecord[]>({
    queryKey: ["/api/deal-statuses"],
  });

  const form = useForm<EditDealStatusValues>({
    resolver: zodResolver(editDealStatusSchema),
    defaultValues: {
      name: "",
      winProbability: 0,
      sortOrder: 0,
      colorLight: "#888888",
      colorDark: "#aaaaaa",
      isActive: true,
      isDefault: false,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EditDealStatusValues) => {
      const res = await apiRequest("PATCH", `/api/deal-statuses/${editingStatus!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deal-statuses"] });
      toast({ title: "Deal status updated" });
      setEditingStatus(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  function openEdit(status: DealStatusRecord) {
    setEditingStatus(status);
    form.reset({
      name: status.name,
      winProbability: status.winProbability,
      sortOrder: status.sortOrder,
      colorLight: status.colorLight,
      colorDark: status.colorDark,
      isActive: status.isActive,
      isDefault: status.isDefault,
    });
  }

  function onSubmit(values: EditDealStatusValues) {
    updateMutation.mutate(values);
  }

  const breadcrumbs = [
    { label: "Deals", href: "/deals" },
    { label: "Statuses" },
  ];

  if (permLoading || isLoading) {
    return (
      <PageLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center h-full min-h-[200px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (!can("sales.manage")) {
    return <NoPermissionMessage />;
  }

  return (
    <PageLayout breadcrumbs={breadcrumbs}>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Win Probability</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead>Light Color</TableHead>
              <TableHead>Dark Color</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Default</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {statuses.map((status) => (
              <TableRow key={status.id} data-testid={`row-deal-status-${status.id}`}>
                <TableCell className="font-medium" data-testid={`text-status-name-${status.id}`}>
                  {status.name}
                </TableCell>
                <TableCell data-testid={`text-status-probability-${status.id}`}>
                  {status.winProbability}%
                </TableCell>
                <TableCell data-testid={`text-status-sort-${status.id}`}>
                  {status.sortOrder}
                </TableCell>
                <TableCell>
                  <ColorSwatch color={status.colorLight} />
                </TableCell>
                <TableCell>
                  <ColorSwatch color={status.colorDark} />
                </TableCell>
                <TableCell>
                  <Badge variant={status.isActive ? "default" : "secondary"} data-testid={`badge-status-active-${status.id}`}>
                    {status.isActive ? "Yes" : "No"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {status.isDefault && (
                    <Badge variant="outline" data-testid={`badge-status-default-${status.id}`}>
                      Default
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEdit(status)}
                    data-testid={`button-edit-status-${status.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {statuses.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No deal statuses found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!editingStatus} onOpenChange={(open) => !open && setEditingStatus(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit Deal Status</DialogTitle>
            <DialogDescription>
              Update the deal status details below.
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
                      <Input {...field} data-testid="input-status-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="winProbability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Win Probability (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} {...field} data-testid="input-status-win-probability" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="input-status-sort-order" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="colorLight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Light Color</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-md border border-border flex-shrink-0"
                            style={{ backgroundColor: field.value }}
                          />
                          <Input {...field} data-testid="input-status-color-light" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="colorDark"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dark Color</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-md border border-border flex-shrink-0"
                            style={{ backgroundColor: field.value }}
                          />
                          <Input {...field} data-testid="input-status-color-dark" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-3">
                      <FormLabel className="cursor-pointer">Active</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-status-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-3">
                      <FormLabel className="cursor-pointer">Default</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-status-default"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingStatus(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-save-status"
                >
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      </div>
    </PageLayout>
  );
}

export default ManageDealStatuses;
