import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Play, Braces, Building2, LayoutDashboard, Zap, Activity } from "lucide-react";
import type { DealWithRelations } from "@shared/schema";

type EndpointType = "deal" | "workspace" | "actions" | "recent-activity";

interface EndpointConfig {
  id: EndpointType;
  name: string;
  description: string;
  icon: typeof Braces;
  getUrl: (dealId?: string) => string;
  requiresDeal: boolean;
}

const endpoints: EndpointConfig[] = [
  {
    id: "deal",
    name: "Deal Context",
    description: "Get AI-optimized context for a specific deal including summary and suggested actions",
    icon: Building2,
    getUrl: (dealId) => `/api/ai/context/deal/${dealId}`,
    requiresDeal: true,
  },
  {
    id: "workspace",
    name: "Workspace Context",
    description: "Get current user context, deals summary by status, and activity counts",
    icon: LayoutDashboard,
    getUrl: () => "/api/ai/context/workspace",
    requiresDeal: false,
  },
  {
    id: "actions",
    name: "Available Actions",
    description: "List all MCP tools with descriptions, parameters, and risk levels",
    icon: Zap,
    getUrl: () => "/api/ai/actions",
    requiresDeal: false,
  },
  {
    id: "recent-activity",
    name: "Recent Activity",
    description: "Get recent domain events for AI observability",
    icon: Activity,
    getUrl: () => "/api/ai/recent-activity",
    requiresDeal: false,
  },
];

export default function AIContextPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointType | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string>("");
  const [response, setResponse] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: deals } = useQuery<DealWithRelations[]>({
    queryKey: ["/api/deals", { limit: 25, sort: "updatedAt", order: "desc" }],
  });

  const handleTrigger = async (endpoint: EndpointConfig) => {
    if (endpoint.requiresDeal && !selectedDealId) {
      setError("Please select a deal first");
      return;
    }

    setSelectedEndpoint(endpoint.id);
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const url = endpoint.getUrl(selectedDealId);
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
      } else {
        setResponse(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setIsLoading(false);
    }
  };

  const recentDeals = deals?.slice(0, 25) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">AI Context Explorer</h1>
        <p className="text-muted-foreground mt-1">
          Test the AI context endpoints to see what data is available to AI assistants
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Deal Selection</CardTitle>
              <CardDescription>
                Select a deal to use with the Deal Context endpoint
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedDealId} onValueChange={setSelectedDealId}>
                <SelectTrigger data-testid="select-deal">
                  <SelectValue placeholder="Select a deal..." />
                </SelectTrigger>
                <SelectContent>
                  {recentDeals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id} data-testid={`select-deal-${deal.id}`}>
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[200px]">{deal.displayName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {deal.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                  {recentDeals.length === 0 && (
                    <SelectItem value="none" disabled>
                      No deals available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">AI Context Endpoints</CardTitle>
              <CardDescription>
                Click an endpoint to fetch and view its response
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {endpoints.map((endpoint) => {
                const Icon = endpoint.icon;
                const isActive = selectedEndpoint === endpoint.id;
                const isDisabled = endpoint.requiresDeal && !selectedDealId;

                return (
                  <div
                    key={endpoint.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      isActive ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="mt-0.5">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{endpoint.name}</span>
                        {endpoint.requiresDeal && (
                          <Badge variant="outline" className="text-xs">
                            Requires Deal
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {endpoint.description}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={isActive ? "default" : "outline"}
                      onClick={() => handleTrigger(endpoint)}
                      disabled={isDisabled || isLoading}
                      data-testid={`button-trigger-${endpoint.id}`}
                    >
                      {isLoading && selectedEndpoint === endpoint.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Braces className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Response</CardTitle>
            </div>
            <CardDescription>
              {selectedEndpoint
                ? `Response from ${endpoints.find((e) => e.id === selectedEndpoint)?.name}`
                : "Select an endpoint to view its response"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive" data-testid="text-error">
                {error}
              </div>
            )}

            {!error && !response && !isLoading && (
              <div className="text-center py-12 text-muted-foreground" data-testid="text-empty-state">
                Click an endpoint button to fetch data
              </div>
            )}

            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {response !== null && !isLoading && (
              <ScrollArea className="h-[500px]" data-testid="container-response">
                <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
