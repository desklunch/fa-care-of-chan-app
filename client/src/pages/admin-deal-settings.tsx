import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Save, Loader2, Sheet, Users } from "lucide-react";

export default function AdminDealSettings() {
  usePageTitle("Deal Settings");
  const { toast } = useToast();
  const [templateSheetId, setTemplateSheetId] = useState("");
  const [discoveryTemplateSheetId, setDiscoveryTemplateSheetId] = useState("");
  const [shareDomain, setShareDomain] = useState("");

  const { data, isLoading } = useQuery<{ templateSheetId: string }>({
    queryKey: ["/api/settings/deal-summary-template"],
  });

  const { data: discoveryData, isLoading: isDiscoveryLoading } = useQuery<{ templateSheetId: string }>({
    queryKey: ["/api/settings/deal-discovery-template"],
  });

  const { data: shareDomainData, isLoading: isShareDomainLoading } = useQuery<{ shareDomain: string }>({
    queryKey: ["/api/settings/deal-summary-share-domain"],
  });

  useEffect(() => {
    if (data) {
      setTemplateSheetId(data.templateSheetId || "");
    }
  }, [data]);

  useEffect(() => {
    if (discoveryData) {
      setDiscoveryTemplateSheetId(discoveryData.templateSheetId || "");
    }
  }, [discoveryData]);

  useEffect(() => {
    if (shareDomainData) {
      setShareDomain(shareDomainData.shareDomain || "");
    }
  }, [shareDomainData]);

  const saveMutation = useMutation({
    mutationFn: async (value: string) => {
      await apiRequest("PATCH", "/api/settings/deal-summary-template", { templateSheetId: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/deal-summary-template"] });
      toast({ title: "Template setting saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    },
  });

  const saveDiscoveryMutation = useMutation({
    mutationFn: async (value: string) => {
      await apiRequest("PATCH", "/api/settings/deal-discovery-template", { templateSheetId: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/deal-discovery-template"] });
      toast({ title: "Discovery template setting saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    },
  });

  const saveShareDomainMutation = useMutation({
    mutationFn: async (value: string) => {
      await apiRequest("PATCH", "/api/settings/deal-summary-share-domain", { shareDomain: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/deal-summary-share-domain"] });
      toast({ title: "Share domain saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(templateSheetId);
  };

  const handleSaveDiscovery = () => {
    saveDiscoveryMutation.mutate(discoveryTemplateSheetId);
  };

  const handleSaveShareDomain = () => {
    saveShareDomainMutation.mutate(shareDomain.trim());
  };

  return (
    <PageLayout breadcrumbs={[{ label: "Manage" }, { label: "Deal Settings" }]}>
      <div className="max-w-2xl p-4 md:p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sheet className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base" data-testid="heading-deal-summary-template">
                Deal Summary Template
              </CardTitle>
            </div>
            <CardDescription>
              Set the Google Sheet template used when generating deal summary sheets. The template
              should contain placeholder tokens like {"{{client_name}}"}, {"{{budget_low}}"}, or
              {"{{intake:event-intake:field-event-name}}"} in any cell. When a sheet is generated, these tokens
              are replaced with the deal's data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-sheet-id">Template Google Sheet ID</Label>
              {isLoading ? (
                <div className="flex items-center gap-2 h-9">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <Input
                  id="template-sheet-id"
                  value={templateSheetId}
                  onChange={(e) => setTemplateSheetId(e.target.value)}
                  placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  data-testid="input-template-sheet-id"
                />
              )}
              <p className="text-xs text-muted-foreground">
                The Sheet ID is the long string in the Google Sheets URL between /d/ and /edit.
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              data-testid="button-save-template-setting"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sheet className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base" data-testid="heading-deal-discovery-template">
                Deal Discovery Template
              </CardTitle>
            </div>
            <CardDescription>
              Set the Google Sheet template used when generating sheets from the Deal Discovery tab.
              The template can use the same tokens as the Deal Summary template; intake tokens like
              {" "}{"{{intake:<namespace>:<field-id>}}"} will resolve against the deal's discovery
              responses instead of the client intake.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discovery-template-sheet-id">Template Google Sheet ID</Label>
              {isDiscoveryLoading ? (
                <div className="flex items-center gap-2 h-9">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <Input
                  id="discovery-template-sheet-id"
                  value={discoveryTemplateSheetId}
                  onChange={(e) => setDiscoveryTemplateSheetId(e.target.value)}
                  placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  data-testid="input-discovery-template-sheet-id"
                />
              )}
              <p className="text-xs text-muted-foreground">
                The Sheet ID is the long string in the Google Sheets URL between /d/ and /edit.
              </p>
            </div>

            <Button
              onClick={handleSaveDiscovery}
              disabled={saveDiscoveryMutation.isPending}
              data-testid="button-save-discovery-template-setting"
            >
              {saveDiscoveryMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base" data-testid="heading-deal-summary-share-domain">
                Workspace Sharing
              </CardTitle>
            </div>
            <CardDescription>
              When a deal summary sheet is generated, it will automatically be shared with everyone
              in this Google Workspace domain (writer access). Leave blank to fall back to the
              domain of the user generating the sheet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="share-domain">Workspace Domain</Label>
              {isShareDomainLoading ? (
                <div className="flex items-center gap-2 h-9">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <Input
                  id="share-domain"
                  value={shareDomain}
                  onChange={(e) => setShareDomain(e.target.value)}
                  placeholder="e.g. careofchan.com"
                  data-testid="input-share-domain"
                />
              )}
              <p className="text-xs text-muted-foreground">
                Just the domain, no @ symbol or https://.
              </p>
            </div>

            <Button
              onClick={handleSaveShareDomain}
              disabled={saveShareDomainMutation.isPending}
              data-testid="button-save-share-domain"
            >
              {saveShareDomainMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base" data-testid="heading-available-tokens">Available Tokens</CardTitle>
            <CardDescription>
              Place these tokens in any cell of your Google Sheet template. They will be replaced
              with the deal's actual values when generating a sheet. The same tokens work for both
              the Deal Summary and Deal Discovery templates — intake tokens resolve against
              whichever form kind ({" "}<span className="font-mono">intake</span> or
              {" "}<span className="font-mono">discovery</span>) the export was launched from.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Deal Overview</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {[
                    ["{{deal_name}}", "Deal display name"],
                    ["{{owner}}", "Deal owner name"],
                    ["{{status}}", "Current deal status"],
                    ["{{client_name}}", "Primary client name"],
                    ["{{client_partners}}", "Linked client partners"],
                    ["{{primary_contact}}", "Primary contact name"],
                    ["{{services}}", "Selected services"],
                    ["{{concept}}", "Deal concept"],
                    ["{{next_steps}}", "Next steps"],
                    ["{{notes}}", "Deal notes"],
                    ["{{locations}}", "Event locations"],
                    ["{{location_notes}}", "Location notes"],
                    ["{{project_dates}}", "Event schedule summary"],
                    ["{{project_date_notes}}", "Project date notes"],
                    ["{{budget_low}}", "Budget lower bound"],
                    ["{{budget_high}}", "Budget upper bound"],
                    ["{{budget_notes}}", "Budget notes"],
                    ["{{tags}}", "Deal tags"],
                    ["{{deal_start_date}}", "Deal start date"],
                    ["{{last_client_contact}}", "Last client contact date"],
                    ["{{deal_won_on}}", "Date deal was won"],
                    ["{{proposal_sent_on}}", "Proposal sent date"],
                  ].map(([token, desc]) => (
                    <div key={token} className="flex gap-2 py-0.5">
                      <code className="bg-muted px-1 rounded text-[11px] font-mono flex-shrink-0">{token}</code>
                      <span className="text-muted-foreground truncate">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Intake Fields</p>
                <p className="text-xs text-muted-foreground mb-1">
                  Use the pattern <code className="bg-muted px-1 rounded text-[11px] font-mono">{"{{intake:<namespace>:<field-id>}}"}</code> where
                  <span className="font-mono">&nbsp;namespace</span> is the form template's slug and
                  <span className="font-mono">&nbsp;field-id</span> matches the intake form's field IDs. Use the
                  copy-token button next to each field in the form builder or on a deal's intake to grab the exact token.
                </p>
                <div className="grid grid-cols-1 gap-1 text-xs">
                  {[
                    "{{intake:event-intake:field-event-name}}",
                    "{{intake:event-intake:field-context-concept}}",
                    "{{intake:event-intake:field-food-beverage}}",
                    "{{intake:event-intake:field-venue-type}}",
                  ].map((token) => (
                    <div key={token} className="py-0.5">
                      <code className="bg-muted px-1 rounded text-[11px] font-mono">{token}</code>
                    </div>
                  ))}
                  <p className="text-muted-foreground mt-1">
                    Sections that pre-date namespaces fall back to <code className="bg-muted px-1 rounded text-[11px] font-mono">custom</code>, e.g. <code className="bg-muted px-1 rounded text-[11px] font-mono">{"{{intake:custom:field-notes}}"}</code>.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
