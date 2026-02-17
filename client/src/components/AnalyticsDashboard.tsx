import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Users, Search, Zap, Clock, Target } from "lucide-react";
import { useState, useEffect } from "react";

interface DashboardStats {
  totalSearches: number;
  uniqueUsers: number;
  avgResponseTime: number;
  topSearches: Array<{ term: string; count: number }>;
  searchTrend: Array<{ date: string; searches: number }>;
  coverage: { covered: number; uncovered: number };
}

export function AnalyticsDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSearches: 46848,
    uniqueUsers: 1250,
    avgResponseTime: 245,
    topSearches: [
      { term: "Panadol", count: 1240 },
      { term: "Diabetes", count: 890 },
      { term: "Hypertension", count: 756 },
      { term: "Aspirin", count: 645 },
      { term: "E11", count: 523 },
    ],
    searchTrend: [
      { date: "Mon", searches: 6200 },
      { date: "Tue", searches: 7100 },
      { date: "Wed", searches: 6800 },
      { date: "Thu", searches: 7500 },
      { date: "Fri", searches: 8200 },
      { date: "Sat", searches: 5900 },
      { date: "Sun", searches: 5200 },
    ],
    coverage: { covered: 38500, uncovered: 8348 },
  });

  const [isLoading, setIsLoading] = useState(false);

  // Simulate data loading
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const StatCard = ({ icon: Icon, label, value, change, color }: any) => (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold text-foreground">{value.toLocaleString()}</p>
            {change && (
              <p className={`text-xs font-semibold flex items-center gap-1 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className="h-3 w-3" />
                {change > 0 ? '+' : ''}{change}% from last week
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
        <p className="text-muted-foreground">Real-time insights and performance metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Search}
          label="Total Searches"
          value={stats.totalSearches}
          change={12.5}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          icon={Users}
          label="Active Users"
          value={stats.uniqueUsers}
          change={8.2}
          color="bg-gradient-to-br from-emerald-500 to-emerald-600"
        />
        <StatCard
          icon={Zap}
          label="Avg Response"
          value={`${stats.avgResponseTime}ms`}
          change={-5.1}
          color="bg-gradient-to-br from-orange-500 to-orange-600"
        />
        <StatCard
          icon={Target}
          label="Coverage Rate"
          value={`${Math.round((stats.coverage.covered / (stats.coverage.covered + stats.coverage.uncovered)) * 100)}%`}
          change={2.3}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
      </div>

      {/* Charts and Details */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="trends">Search Trends</TabsTrigger>
          <TabsTrigger value="popular">Popular Searches</TabsTrigger>
          <TabsTrigger value="coverage">Coverage Analysis</TabsTrigger>
        </TabsList>

        {/* Search Trends */}
        <TabsContent value="trends" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Weekly Search Trends</CardTitle>
              <CardDescription>Search volume over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.searchTrend.map((day, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <span className="w-12 text-sm font-medium text-muted-foreground">{day.date}</span>
                    <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-sky-600 rounded-full transition-all duration-500 hover:from-sky-600 hover:to-sky-700"
                        style={{ width: `${(day.searches / 8200) * 100}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-sm font-semibold text-foreground">
                      {day.searches.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Popular Searches */}
        <TabsContent value="popular" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Top 5 Searches</CardTitle>
              <CardDescription>Most searched medications and conditions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topSearches.map((search, idx) => (
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
                          style={{ width: `${(search.count / 1240) * 100}%` }}
                        />
                      </div>
                      <span className="w-16 text-right text-sm font-semibold text-muted-foreground">
                        {search.count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coverage Analysis */}
        <TabsContent value="coverage" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Database Coverage</CardTitle>
              <CardDescription>Covered vs. Non-covered medications and codes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Covered Items</span>
                    <span className="text-2xl font-bold text-emerald-600">
                      {stats.coverage.covered.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
                      style={{ width: `${(stats.coverage.covered / (stats.coverage.covered + stats.coverage.uncovered)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Non-Covered Items</span>
                    <span className="text-2xl font-bold text-orange-600">
                      {stats.coverage.uncovered.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"
                      style={{ width: `${(stats.coverage.uncovered / (stats.coverage.covered + stats.coverage.uncovered)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Total Database Items</span>
                    <span className="text-lg font-bold">
                      {(stats.coverage.covered + stats.coverage.uncovered).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Performance Insights */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-sky-50 to-emerald-50 dark:from-sky-950 dark:to-emerald-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-sky-600" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Avg Load Time</p>
              <p className="text-2xl font-bold text-sky-600">1.2s</p>
              <p className="text-xs text-green-600">↓ 15% faster than last month</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Uptime</p>
              <p className="text-2xl font-bold text-emerald-600">99.8%</p>
              <p className="text-xs text-green-600">Excellent reliability</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Cache Hit Rate</p>
              <p className="text-2xl font-bold text-purple-600">87%</p>
              <p className="text-xs text-green-600">↑ 12% improvement</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
