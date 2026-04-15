import { useState } from "react";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import type { DealWithRelations, User, ProposalStatusRecord } from "@shared/schema";

export default function ProposalForm() {
  usePageTitle("New Proposal");
  const [, setLocation] = useProtectedLocation();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [dealId, setDealId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [description, setDescription] = useState("");

  const { data: deals = [] } = useQuery<DealWithRelations[]>({
    queryKey: ["/api/deals"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: statuses = [] } = useQuery<ProposalStatusRecord[]>({
    queryKey: ["/api/proposals/statuses"],
  });

  const createProposal = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/proposals", data);
      return res.json();
    },
    onSuccess: (proposal) => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      toast({ title: "Proposal created" });
      setLocation(`/proposals/${proposal.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create proposal",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const selectedDeal = deals.find((d) => d.id === dealId);
  const defaultStatus = statuses.find((s) => s.isDefault) || statuses[0];

  const handleSubmit = () => {
    if (!title.trim() || !dealId) return;

    createProposal.mutate({
      title: title.trim(),
      dealId,
      ownerId: ownerId || undefined,
      description: description.trim() || undefined,
      status: defaultStatus?.id,
      clientId: selectedDeal?.clientId || undefined,
    });
  };

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Proposals", href: "/proposals" },
        { label: "New Proposal" },
      ]}
    >
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Create Proposal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deal">Deal *</Label>
              <Select value={dealId} onValueChange={setDealId}>
                <SelectTrigger data-testid="select-deal">
                  <SelectValue placeholder="Select a deal" />
                </SelectTrigger>
                <SelectContent>
                  {deals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.displayName || deal.dealNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Proposal title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-testid="input-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger data-testid="select-owner">
                  <SelectValue placeholder="Select an owner" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the proposal..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-testid="input-description"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setLocation("/proposals")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!title.trim() || !dealId || createProposal.isPending}
                data-testid="button-submit"
              >
                {createProposal.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                Create Proposal
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
