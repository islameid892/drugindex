import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Users, Search, Zap, Clock, Target, Database, Activity, BarChart3, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export function AnalyticsDashboard() {
  const { data: dashboard, isLoading, error, refetch } = trpc.analytics.getDashboard.useQuery(
    undefined,
    {
      refetchInterval: 30000, // Auto-refresh every 30 seconds
      staleTime: 10000,
    }
  );

  const StatCard = ({ icon: Icon, label, value, subtitle, color }: {
    icon: any;
    label: string;
    value: string | number;
    subtitle?: string;
    color: string;
  }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-0">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold text-foreground">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {subtitle && (
              <p className="text-xs font-medium text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-sky-600" />
        <p className="text-muted-foreground font-medium">Loading analytics data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-red-600 font-medium">Failed to load analytics</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const totalSearches = dashboard?.totalSearches || 0;
  const weekSearches = dashboard?.weekSearches || 0;
  const avgResponseTime = dashboard?.avgResponseTime || 0;
  const registeredUsers = dashboard?.registeredUsers || 0;
  const topSearches = dashboard?.topSearches || [];
  const searchTrend = dashboard?.searchTrend || [];
  const coverage = dashboard?.coverage || { covered: 0, uncovered: 0, rate: 0 };
  const dbStats = dashboard?.dbStats || { totalCodes: 0, nonCoveredCodes: 0, totalDrugEntries: 0, uniqueIndications: 0, uniqueScientificNames: 0, uniqueTradeNames: 0, totalBranches: 0 };
  const todayVolume = dashboard?.todayVolume || 0;
  const recentSearches = dashboard?.recentSearches || [];
  const maxTrend = Math.max(...searchTrend.map((d: any) => d.count || 0), 1);
  const maxTopSearch = topSearches.length > 0 ? topSearches[0].count : 1;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time insights from your database
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
              <Activity className="h-3 w-3" /> Live
            </span>
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Search}
          label="Total Searches"
          value={totalSearches}
          subtitle={`${weekSearches} this week · ${todayVolume} today`}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          icon={Users}
          label="Registered Users"
          value={registeredUsers}
          subtitle="All time"
          color="bg-gradient-to-br from-emerald-500 to-emerald-600"
        />
        <StatCard
          icon={Zap}
          label="Avg Response Time"
          value={avgResponseTime > 0 ? `${avgResponseTime}ms` : 'N/A'}
          subtitle={avgResponseTime > 0 ? (avgResponseTime < 500 ? 'Fast' : 'Normal') : 'No data yet'}
          color="bg-gradient-to-br from-orange-500 to-orange-600"
        />
        <StatCard
          icon={Target}
          label="Coverage Rate"
          value={`${coverage.rate}%`}
          subtitle={`${coverage.covered.toLocaleString()} covered of ${(coverage.covered + coverage.uncovered).toLocaleString()}`}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
      </div>

      {/* Charts and Details */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="trends">Search Trends</TabsTrigger>
          <TabsTrigger value="popular">Top Searches</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>

        {/* Search Trends */}
        <TabsContent value="trends" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Weekly Search Trends</CardTitle>
              <CardDescription>
                Search volume over the last 7 days
                {searchTrend.length === 0 && ' — No searches recorded yet'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {searchTrend.length > 0 ? (
                <div className="space-y-4">
                  {searchTrend.map((day: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground min-w-20">{day.date}</span>
                      <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-sky-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(((day.count || 0) / maxTrend) * 100, 2)}%` }}
                        />
                      </div>
                      <span className="w-16 text-right text-sm font-semibold text-foreground">
                        {(day.count || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No search data yet</p>
                  <p className="text-sm mt-1">Search trends will appear here as users perform searches</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Popular Searches */}
        <TabsContent value="popular" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Top Searches</CardTitle>
              <CardDescription>
                Most searched terms by users
                {topSearches.length === 0 && ' — No searches recorded yet'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topSearches.length > 0 ? (
                <div className="space-y-3">
                  {topSearches.map((search: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-600 text-white text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="font-medium">{search.term}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                            style={{ width: `${(search.count / maxTopSearch) * 100}%` }}
                          />
                        </div>
                        <span className="w-16 text-right text-sm font-semibold text-muted-foreground">
                          {search.count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No search data yet</p>
                  <p className="text-sm mt-1">Popular searches will appear here as users search for codes and medications</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coverage Analysis */}
        <TabsContent value="coverage" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Database Coverage</CardTitle>
              <CardDescription>Real-time coverage statistics from the database</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Covered ICD-10 Codes</span>
                    <span className="text-2xl font-bold text-emerald-600">
                      {coverage.covered.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
                      style={{ width: `${coverage.rate}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Non-Covered ICD-10 Codes</span>
                    <span className="text-2xl font-bold text-orange-600">
                      {coverage.uncovered.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"
                      style={{ width: `${100 - coverage.rate}%` }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Codes</p>
                      <p className="text-xl font-bold">{dbStats.totalCodes.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Non-Covered</p>
                      <p className="text-xl font-bold">{dbStats.nonCoveredCodes.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Medications</p>
                      <p className="text-xl font-bold">{dbStats.totalDrugEntries.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Conditions</p>
                      <p className="text-xl font-bold">{dbStats.uniqueIndications.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Searches */}
        <TabsContent value="recent" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Recent Searches</CardTitle>
              <CardDescription>
                Last 20 search queries performed by users
                {recentSearches.length === 0 && ' — No searches recorded yet'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentSearches.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Query</th>
                        <th className="px-4 py-2 text-left font-semibold">Results</th>
                        <th className="px-4 py-2 text-left font-semibold">Response</th>
                        <th className="px-4 py-2 text-left font-semibold">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSearches.map((search: any, idx: number) => (
                        <tr key={idx} className="border-b border-muted hover:bg-muted/30">
                          <td className="px-4 py-2 font-medium">{search.query}</td>
                          <td className="px-4 py-2">{search.resultsCount}</td>
                          <td className="px-4 py-2">
                            {search.responseTime > 0 ? `${search.responseTime}ms` : '-'}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground text-xs">
                            {search.timestamp ? new Date(search.timestamp).toLocaleString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No recent searches</p>
                  <p className="text-sm mt-1">Recent search activity will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Database Summary */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-sky-50 to-emerald-50 dark:from-sky-950 dark:to-emerald-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-sky-600" />
            Database Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">ICD-10 Codes</p>
              <p className="text-2xl font-bold text-sky-600">{dbStats.totalCodes.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Medications</p>
              <p className="text-2xl font-bold text-emerald-600">{dbStats.totalDrugEntries.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Conditions</p>
              <p className="text-2xl font-bold text-purple-600">{dbStats.uniqueIndications.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Coverage Rate</p>
              <p className="text-2xl font-bold text-orange-600">{coverage.rate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
