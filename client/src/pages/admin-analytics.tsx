import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Users, Eye, Clock, TrendingUp, Route, MousePointer, List } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, subDays, startOfDay, endOfDay, formatDistanceToNow } from "date-fns";

interface AnalyticsSummary {
  totalPageViews: number;
  uniqueUsers: number;
  totalSessions: number;
  avgSessionDuration: number;
  topPages: { path: string; views: number }[];
  topEvents: { name: string; count: number }[];
  pageViewsByDay: { date: string; views: number }[];
  userJourneys: { userId: string; userName: string; paths: string[] }[];
}

interface RecentPageView {
  id: string;
  path: string;
  title: string | null;
  viewedAt: string;
  durationMs: number | null;
  userName: string | null;
  environment: string;
}

export default function AdminAnalytics() {
  const [dateRange, setDateRange] = useState("30");
  const [environment, setEnvironment] = useState("production");

  // Memoize dates to prevent infinite re-fetching
  const { startDateStr, endDateStr } = useMemo(() => {
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(end, parseInt(dateRange)));
    return {
      startDateStr: start.toISOString(),
      endDateStr: end.toISOString(),
    };
  }, [dateRange]);

  const { data, isLoading, error } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/admin/analytics", dateRange, environment],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/analytics?startDate=${startDateStr}&endDate=${endDateStr}&environment=${environment}`
      );
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    staleTime: 60000, // Data is fresh for 1 minute
  });

  const { data: recentPageViews } = useQuery<RecentPageView[]>({
    queryKey: ["/api/admin/analytics/pageviews/recent", environment],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/analytics/pageviews/recent?limit=50&environment=${environment}`
      );
      if (!res.ok) throw new Error("Failed to fetch recent page views");
      return res.json();
    },
    staleTime: 30000, // Data is fresh for 30 seconds
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Analytics</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-24" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="py-8 text-center text-destructive">
            Failed to load analytics data. Please try again.
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    {
      title: "Page Views",
      value: data?.totalPageViews || 0,
      icon: Eye,
      description: `Last ${dateRange} days`,
    },
    {
      title: "Unique Users",
      value: data?.uniqueUsers || 0,
      icon: Users,
      description: "Active users",
    },
    {
      title: "Sessions",
      value: data?.totalSessions || 0,
      icon: TrendingUp,
      description: "Total sessions",
    },
    {
      title: "Avg. Session",
      value: `${data?.avgSessionDuration || 0} min`,
      icon: Clock,
      description: "Average duration",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-analytics-title">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Monitor user activity and engagement</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={environment} onValueChange={setEnvironment}>
            <SelectTrigger className="w-[160px]" data-testid="select-environment">
              <SelectValue placeholder="Environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="development">Development</SelectItem>
              <SelectItem value="all">All Environments</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]" data-testid="select-date-range">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Page Views Over Time
            </CardTitle>
            <CardDescription>Daily page view trends</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.pageViewsByDay && data.pageViewsByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.pageViewsByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => format(new Date(date), "MMM d")}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    labelFormatter={(date) => format(new Date(date), "MMM d, yyyy")}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available for this period
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Top Pages
            </CardTitle>
            <CardDescription>Most visited pages</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.topPages && data.topPages.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.topPages} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis
                    type="category"
                    dataKey="path"
                    width={150}
                    className="text-xs"
                    tickFormatter={(path) => path.length > 20 ? `${path.substring(0, 20)}...` : path}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No pages visited yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointer className="h-5 w-5" />
              Top Events
            </CardTitle>
            <CardDescription>Most triggered events</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.topEvents && data.topEvents.length > 0 ? (
              <div className="space-y-3">
                {data.topEvents.map((event, i) => (
                  <div key={event.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-6">{i + 1}.</span>
                      <span className="font-medium">{event.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{event.count} times</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No events tracked yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              User Journeys
            </CardTitle>
            <CardDescription>Recent navigation paths by user</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.userJourneys && data.userJourneys.length > 0 ? (
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {data.userJourneys.map((journey) => (
                  <div key={journey.userId} className="space-y-1">
                    <p className="font-medium text-sm">{journey.userName}</p>
                    <div className="flex items-center gap-1 flex-wrap text-xs text-muted-foreground">
                      {journey.paths.slice(0, 8).map((path, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <span className="bg-accent px-2 py-0.5 rounded">{path}</span>
                          {i < Math.min(journey.paths.length - 1, 7) && (
                            <span className="text-muted-foreground">→</span>
                          )}
                        </span>
                      ))}
                      {journey.paths.length > 8 && (
                        <span className="text-muted-foreground">+{journey.paths.length - 8} more</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No user journeys recorded yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Recent Page Views
          </CardTitle>
          <CardDescription>50 most recent page views</CardDescription>
        </CardHeader>
        <CardContent>
          {recentPageViews && recentPageViews.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Page</th>
                    <th className="pb-2 font-medium text-muted-foreground">User</th>
                    <th className="pb-2 font-medium text-muted-foreground">Time</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPageViews.map((pv) => (
                    <tr key={pv.id} className="border-b last:border-0" data-testid={`row-pageview-${pv.id}`}>
                      <td className="py-2">
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[200px]" title={pv.path}>
                            {pv.path}
                          </span>
                          {pv.title && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={pv.title}>
                              {pv.title}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {pv.userName || "Anonymous"}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {formatDistanceToNow(new Date(pv.viewedAt), { addSuffix: true })}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {pv.durationMs != null ? `${Math.round(pv.durationMs / 1000)}s` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              No page views recorded yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
