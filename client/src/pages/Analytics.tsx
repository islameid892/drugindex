import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Users,
  Zap,
  Target,
  Database,
  Pill,
  Activity,
  TrendingUp,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function Analytics() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);

  const analyticsQuery = trpc.analytics.getDashboard.useQuery();

  useEffect(() => {
    if (!authLoading && user && user.role !== "admin") {
      setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  useEffect(() => {
    if (analyticsQuery.data) {
      setLoading(false);
    }
  }, [analyticsQuery.data]);

  const handleRefresh = () => {
    setIsLive(false);
    analyticsQuery.refetch();
    setTimeout(() => setIsLive(true), 2000);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analyticsQuery.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400">Failed to load analytics</p>
        </div>
      </div>
    );
  }

  const data = analyticsQuery.data as any;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-40">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => setLocation("/")}
                  className="flex items-center gap-2 text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-medium"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Analytics Dashboard
                </h1>
              </div>
              <p className="text-slate-600 dark:text-slate-400 ml-9">
                Real-time insights from your database
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isLive ? "bg-green-500 animate-pulse" : "bg-slate-400"
                  }`}
                ></div>
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {isLive ? "Live" : "Updating..."}
                </span>
              </div>
              <Button
                onClick={handleRefresh}
                disabled={!isLive}
                className="gap-2 bg-sky-500 hover:bg-sky-600"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Searches */}
          <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Searches
                </CardTitle>
                <div className="bg-sky-100 dark:bg-sky-900 p-2 rounded-lg">
                  <Search className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {data.totalSearches?.toLocaleString() || 0}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                {data.weekSearches || 0} this week · {data.todayVolume || 0} today
              </p>
            </CardContent>
          </Card>

          {/* Registered Users */}
          <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Registered Users
                </CardTitle>
                <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {data.registeredUsers?.toLocaleString() || 0}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">All time</p>
            </CardContent>
          </Card>

          {/* Avg Response Time */}
          <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Avg Response Time
                </CardTitle>
                <div className="bg-orange-100 dark:bg-orange-900 p-2 rounded-lg">
                  <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {data.avgResponseTime || 0}ms
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Last 100 requests</p>
            </CardContent>
          </Card>

          {/* Coverage Rate */}
          <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Coverage Rate
                </CardTitle>
                <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-lg">
                  <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {data.coverage || 0}%
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Search success rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Database Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* ICD-10 Codes */}
          <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  ICD-10 Codes
                </CardTitle>
                <Database className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {data.dbStats?.icd10_codes?.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>

          {/* Medications */}
          <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Medications
                </CardTitle>
                <Pill className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {data.dbStats?.medications?.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>

          {/* Conditions */}
          <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Conditions
                </CardTitle>
                <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {data.dbStats?.conditions?.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>

          {/* Coverage Rate */}
          <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Coverage
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {data.coverage || 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <TabsTrigger value="trends">Search Trends</TabsTrigger>
            <TabsTrigger value="top">Top Searches</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>

          {/* Search Trends Tab */}
          <TabsContent value="trends">
            <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
              <CardHeader>
                <CardTitle>Weekly Search Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.searchTrend?.map((trend: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-20 text-sm font-medium text-slate-600 dark:text-slate-400">
                        {new Date(trend.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-8 flex items-center overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-sky-400 to-sky-600 h-full flex items-center justify-end pr-3"
                          style={{
                            width: `${
                              (trend.count /
                                Math.max(
                                  ...data.searchTrend.map((t: any) => t.count),
                                  1
                                )) *
                              100
                            }%`,
                          }}
                        >
                          <span className="text-xs font-bold text-white">
                            {trend.count}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Searches Tab */}
          <TabsContent value="top">
            <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
              <CardHeader>
                <CardTitle>Top 10 Searches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.topSearches?.map((search: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-sky-600 dark:text-sky-400 w-6">
                          #{idx + 1}
                        </span>
                        <span className="text-slate-900 dark:text-white font-medium">
                          {search.search_term}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                        {search.count} searches
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Searches Tab */}
          <TabsContent value="recent">
            <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
              <CardHeader>
                <CardTitle>Recent Searches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {data.recentSearches?.map((search: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                    >
                      <div className="flex-1">
                        <p className="text-slate-900 dark:text-white font-medium">
                          {search.search_term}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {new Date(search.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          search.has_results
                            ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                            : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {search.has_results ? "Found" : "No Results"}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
