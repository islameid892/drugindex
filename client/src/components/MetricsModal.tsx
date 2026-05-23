import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Activity, Clock, BarChart3, Users, Search, X, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ResponseTimeChart } from "@/components/charts/ResponseTimeChart";
import { HourlyActivityChart } from "@/components/charts/HourlyActivityChart";

type TimeFilter = "day" | "week" | "month" | "all";

interface MetricsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIME_FILTER_LABELS: Record<TimeFilter, string> = {
  day: "24h",
  week: "7 Days",
  month: "30 Days",
  all: "All Time",
};

function FeatureUsageStats({ timeFilter }: { timeFilter: TimeFilter }) {
  const { data: featureStats } = trpc.analytics.getAllFeatureUsageStats.useQuery(
    { days: timeFilter === "day" ? 1 : timeFilter === "week" ? 7 : timeFilter === "month" ? 30 : 365 },
    { enabled: true }
  );

  const features = [
    { name: "advanced_search", label: "Advanced Search", icon: "🔍", color: "text-blue-600" },
    { name: "drug_lens", label: "Drug Lens", icon: "💊", color: "text-green-600" },
  ];

  return (
    <div className="space-y-2">
      {features.map((feature) => {
        const stat = featureStats && featureStats.length > 0 ? featureStats.find((s: any) => s.feature === feature.name) : null;
        const count = (stat as any)?.count || 0;
        return (
          <div key={feature.name} className="flex items-center justify-between py-2 border-b last:border-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{feature.icon}</span>
              <span className="text-sm font-medium">{feature.label}</span>
            </div>
            <div className={`text-lg font-bold ${feature.color}`}>
              {count.toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MetricsModal({ open, onOpenChange }: MetricsModalProps) {
  const [activeTab, setActiveTab] = useState("metrics");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month");

  const { data: metricsData, isLoading: metricsLoading } = trpc.monitoring.getMetrics.useQuery(
    { timeFilter },
    {
      refetchInterval: open ? 30000 : false,
      staleTime: 10000,
      enabled: open,
    }
  );

  const { data: analyticsData, isLoading: analyticsLoading } = trpc.monitoring.getAnalytics.useQuery(
    { timeFilter },
    {
      refetchInterval: open ? 30000 : false,
      staleTime: 10000,
      enabled: open,
    }
  );

  const isLoading = metricsLoading || analyticsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="
          p-0 gap-0 overflow-hidden
          w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)]
          sm:w-[calc(100vw-2rem)] sm:max-w-3xl
          lg:max-w-5xl
          max-h-[92vh] flex flex-col
          rounded-xl
        "
      >
        {/* ── Sticky Header ── */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 border-b bg-background shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/40 shrink-0">
              <BarChart3 className="h-4 w-4 text-sky-600" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-semibold leading-tight truncate">
              Performance Metrics & Analytics
            </DialogTitle>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="
              shrink-0 flex items-center justify-center
              w-8 h-8 rounded-lg
              text-muted-foreground hover:text-foreground
              hover:bg-muted
              transition-colors focus:outline-none focus:ring-2 focus:ring-ring
            "
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Time Filter Bar ── */}
        <div className="flex items-center gap-1.5 px-4 pt-3 sm:px-6 shrink-0">
          <span className="text-xs text-muted-foreground mr-1">Period:</span>
          {(["day", "week", "month", "all"] as TimeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`
                px-3 py-1 rounded-full text-xs font-medium transition-colors
                ${timeFilter === f
                  ? "bg-sky-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"}
              `}
            >
              {TIME_FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Tab Bar */}
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="metrics" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                <span>Metrics</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Activity className="h-3.5 w-3.5 shrink-0" />
                <span>Analytics</span>
              </TabsTrigger>
            </TabsList>

            {/* ── Metrics Tab ── */}
            <TabsContent value="metrics" className="space-y-4 mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
                </div>
              ) : metricsData ? (
                <div className="space-y-4">
                  {/* Response Time Chart */}
                  <Card>
                    <CardHeader className="pb-2 px-4 pt-4">
                      <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4 text-sky-600 shrink-0" />
                        Response Time Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <ResponseTimeChart
                        data={[]}
                        avgResponseTime={metricsData.avgResponseTime}
                        minResponseTime={metricsData.minResponseTime}
                        maxResponseTime={metricsData.maxResponseTime}
                      />
                    </CardContent>
                  </Card>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardHeader className="pb-1 px-4 pt-4">
                        <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                          <Search className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                          Total Searches ({TIME_FILTER_LABELS[timeFilter]})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="text-2xl sm:text-3xl font-bold text-sky-600">
                          {metricsData.totalSearches || 0}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-1 px-4 pt-4">
                        <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          Avg Response
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="text-2xl sm:text-3xl font-bold text-emerald-600">
                          {Number(metricsData.avgResponseTime || 0).toFixed(0)}
                          <span className="text-sm font-normal ml-0.5">ms</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-1 px-4 pt-4">
                        <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                          Min Response
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                          {metricsData.minResponseTime || 0}
                          <span className="text-sm font-normal ml-0.5">ms</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-1 px-4 pt-4">
                        <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 text-red-600 shrink-0" />
                          Max Response
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="text-2xl sm:text-3xl font-bold text-red-600">
                          {metricsData.maxResponseTime || 0}
                          <span className="text-sm font-normal ml-0.5">ms</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                  No metrics data available
                </div>
              )}
            </TabsContent>

            {/* ── Analytics Tab ── */}
            <TabsContent value="analytics" className="space-y-4 mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
                </div>
              ) : analyticsData ? (
                <div className="space-y-4">
                  {/* Active Users */}
                  <Card>
                    <CardHeader className="pb-1 px-4 pt-4">
                      <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4 text-sky-600 shrink-0" />
                        Active Users (Last 15 min)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="text-2xl sm:text-3xl font-bold text-sky-600">
                        {analyticsData.activeUsers || 0}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Searches */}
                  <Card>
                    <CardHeader className="pb-2 px-4 pt-4">
                      <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0" />
                        Top Searches ({TIME_FILTER_LABELS[timeFilter]})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="space-y-1">
                        {analyticsData.topSearches && analyticsData.topSearches.length > 0 ? (
                          analyticsData.topSearches.map((search, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between py-2 border-b last:border-0 gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs text-muted-foreground w-5 shrink-0">
                                  {idx + 1}.
                                </span>
                                <span className="text-sm font-medium truncate">{search.term}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {search.count}×
                                </span>
                                {search.avgResponseTime != null && (
                                  <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
                                    {Number(search.avgResponseTime).toFixed(0)}ms
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground py-2">No searches yet</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Feature Usage Stats */}
                  <Card>
                    <CardHeader className="pb-2 px-4 pt-4">
                      <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-600 shrink-0" />
                        Feature Usage ({TIME_FILTER_LABELS[timeFilter]})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <FeatureUsageStats timeFilter={timeFilter} />
                    </CardContent>
                  </Card>

                  {/* Recent Searches */}
                  <Card>
                    <CardHeader className="pb-2 px-4 pt-4">
                      <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                        <Search className="h-4 w-4 text-purple-600 shrink-0" />
                        Recent Searches
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="space-y-1 max-h-56 overflow-y-auto">
                        {analyticsData?.recentSearches && Array.isArray(analyticsData.recentSearches) && analyticsData.recentSearches.length > 0 ? (
                          analyticsData.recentSearches.map((search: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-start justify-between py-2 border-b last:border-0 gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{search?.term || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {search?.timestamp
                                    ? new Date(search.timestamp).toLocaleString()
                                    : 'N/A'}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs text-muted-foreground">{search?.responseTime ?? 0}ms</p>
                                <p className="text-xs text-muted-foreground">{search?.resultsCount ?? 0} results</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground py-2">No searches yet</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Hourly Activity Chart */}
                  {analyticsData.hourlyActivity && analyticsData.hourlyActivity.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2 px-4 pt-4">
                        <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-red-600 shrink-0" />
                          Activity ({TIME_FILTER_LABELS[timeFilter]})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <HourlyActivityChart data={analyticsData.hourlyActivity} />
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                  No analytics data available
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Sticky Footer ── */}
        <div className="shrink-0 px-4 py-2 sm:px-6 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Auto-refreshes every 30 seconds
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
