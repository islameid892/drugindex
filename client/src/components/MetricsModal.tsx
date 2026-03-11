import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Activity, Clock, BarChart3, Users, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ResponseTimeChart } from "@/components/charts/ResponseTimeChart";
import { HourlyActivityChart } from "@/components/charts/HourlyActivityChart";

interface MetricsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MetricsModal({ open, onOpenChange }: MetricsModalProps) {
  const [activeTab, setActiveTab] = useState("metrics");

  // Fetch metrics data with auto-refresh every 5 seconds
  const { data: metricsData, isLoading: metricsLoading } = trpc.monitoring.getMetrics.useQuery(undefined, {
    refetchInterval: 5000,
    staleTime: 2000,
  });

  // Fetch analytics data with auto-refresh every 5 seconds
  const { data: analyticsData, isLoading: analyticsLoading } = trpc.monitoring.getAnalytics.useQuery(undefined, {
    refetchInterval: 5000,
    staleTime: 2000,
  });

  const isLoading = metricsLoading || analyticsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-sky-600" />
            Performance Metrics & Analytics
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="metrics" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Metrics</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
              </div>
            ) : metricsData ? (
              <div className="space-y-4">
                {/* Response Time Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-sky-600" />
                      Response Time Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponseTimeChart
                      data={[]}
                      avgResponseTime={metricsData.avgResponseTime}
                      minResponseTime={metricsData.minResponseTime}
                      maxResponseTime={metricsData.maxResponseTime}
                    />
                  </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Total Searches */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Search className="h-4 w-4 text-sky-600" />
                        Total Searches (24h)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-sky-600">
                        {metricsData.totalSearches || 0}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Average Response Time */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4 text-emerald-600" />
                        Avg Response Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-emerald-600">
                        {metricsData.avgResponseTime?.toFixed(2) || 0}ms
                      </div>
                    </CardContent>
                  </Card>

                  {/* Min Response Time */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-600" />
                        Min Response Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-purple-600">
                        {metricsData.minResponseTime || 0}ms
                      </div>
                    </CardContent>
                  </Card>

                  {/* Max Response Time */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4 text-red-600" />
                        Max Response Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-600">
                        {metricsData.maxResponseTime || 0}ms
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
              </div>
            ) : analyticsData ? (
              <div className="space-y-4">
                {/* Active Users */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-sky-600" />
                      Active Users (Last 15 minutes)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-sky-600">
                      {analyticsData.activeUsers || 0}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Searches */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      Top Searches
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analyticsData.topSearches && analyticsData.topSearches.length > 0 ? (
                        analyticsData.topSearches.map((search, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                            <span className="text-sm font-medium">{search.term}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">{search.count} searches</span>
                              {search.avgResponseTime && (
                                <span className="text-xs text-muted-foreground">
                                  ({search.avgResponseTime.toFixed(0)}ms)
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No searches yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Searches */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Search className="h-4 w-4 text-purple-600" />
                      Recent Searches
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {analyticsData.recentSearches && analyticsData.recentSearches.length > 0 ? (
                        analyticsData.recentSearches.map((search, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div className="flex-1">
                              <p className="text-sm font-medium truncate">{search.term}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(search.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">
                                {search.responseTime}ms
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {search.resultsCount} results
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No searches yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Hourly Activity Chart */}
                {analyticsData.hourlyActivity && analyticsData.hourlyActivity.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-red-600" />
                        Hourly Activity (Last 24 hours)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <HourlyActivityChart data={analyticsData.hourlyActivity} />
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </TabsContent>
        </Tabs>

        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          Data updates automatically every 5 seconds
        </div>
      </DialogContent>
    </Dialog>
  );
}
