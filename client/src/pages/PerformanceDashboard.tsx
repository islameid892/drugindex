import { useEffect, useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, Activity, Clock, BarChart3, Users, Search,
  RefreshCw, ArrowLeft, AlertCircle, CheckCircle2,
} from "lucide-react";
import { useLocation } from "wouter";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PerformanceMetric {
  timestamp: string;
  value: number;
}

interface SearchTrend {
  term: string;
  count: number;
  avgResponseTime: number;
}

interface HourlyActivity {
  hour: string;
  searches: number;
  avgResponseTime: number;
}

export default function PerformanceDashboard() {
  const [, setLocation] = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch metrics data
  const metricsQuery = trpc.monitoring.getMetrics.useQuery(undefined, {
    refetchInterval: autoRefresh ? 30000 : false,
    staleTime: 10000,
  });

  // Fetch analytics data
  const analyticsQuery = trpc.monitoring.getAnalytics.useQuery(undefined, {
    refetchInterval: autoRefresh ? 30000 : false,
    staleTime: 10000,
  });

  const metricsData = metricsQuery.data;
  const analyticsData = analyticsQuery.data;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([metricsQuery.refetch(), analyticsQuery.refetch()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Response Time Chart Data
  const responseTimeChartData = {
    labels: ["Min", "Avg", "Max"],
    datasets: [
      {
        label: "Response Time (ms)",
        data: [
          metricsData?.minResponseTime ?? 0,
          metricsData?.avgResponseTime ?? 0,
          metricsData?.maxResponseTime ?? 0,
        ],
        borderColor: "#0ea5e9",
        backgroundColor: "rgba(14, 165, 233, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointBackgroundColor: "#0ea5e9",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  };

  // Hourly Activity Chart Data
  const hourlyActivityChartData = {
    labels: analyticsData?.hourlyActivity?.map((h: any) => h.hour) ?? [],
    datasets: [
      {
        label: "Searches per Hour",
        data: analyticsData?.hourlyActivity?.map((h: any) => h.searches) ?? [],
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#10b981",
      },
    ],
  };

  // Search Trends Chart Data
  const searchTrendsChartData = {
    labels: analyticsData?.topSearches?.slice(0, 5).map((s: any) => s.term) ?? [],
    datasets: [
      {
        label: "Search Count",
        data: analyticsData?.topSearches?.slice(0, 5).map((s: any) => s.count) ?? [],
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(139, 92, 246, 0.8)",
          "rgba(236, 72, 153, 0.8)",
          "rgba(249, 115, 22, 0.8)",
          "rgba(34, 197, 94, 0.8)",
        ],
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        borderRadius: 8,
        titleFont: { size: 14, weight: "bold" as const },
        bodyFont: { size: 13 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const isLoading = metricsQuery.isLoading || analyticsQuery.isLoading;
  const isError = metricsQuery.isError || analyticsQuery.isError;

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Failed to load performance data</p>
          <Button onClick={handleRefresh} className="bg-sky-500 hover:bg-sky-600">
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur sticky top-0 z-40">
        <div className="container py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation("/")}
                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-700 transition"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                  Performance Dashboard
                </h1>
                <p className="text-xs text-slate-400">Real-time system performance metrics</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Auto-refresh</span>
              </label>
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                size="sm"
                className="gap-2 bg-sky-500 hover:bg-sky-600 text-white"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Searches */}
          <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="bg-sky-100 dark:bg-sky-900/50 p-2.5 rounded-xl">
                  <Search className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Total Searches (24h)</p>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {metricsData?.totalSearches?.toLocaleString() ?? 0}
              </div>
            </CardContent>
          </Card>

          {/* Avg Response Time */}
          <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2.5 rounded-xl">
                  <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Avg Response Time</p>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {metricsData?.avgResponseTime?.toFixed(1) ?? 0}
                <span className="text-sm text-slate-400">ms</span>
              </div>
            </CardContent>
          </Card>

          {/* Active Users */}
          <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="bg-purple-100 dark:bg-purple-900/50 p-2.5 rounded-xl">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Active Users (15m)</p>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {analyticsData?.activeUsers?.toLocaleString() ?? 0}
              </div>
            </CardContent>
          </Card>

          {/* Top Search */}
          <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="bg-orange-100 dark:bg-orange-900/50 p-2.5 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Top Search Term</p>
              <div className="text-lg font-bold text-slate-900 dark:text-white truncate">
                {analyticsData?.topSearches?.[0]?.term ?? "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="response-time" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="response-time" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Response Time</span>
            </TabsTrigger>
            <TabsTrigger value="hourly-activity" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Hourly Activity</span>
            </TabsTrigger>
            <TabsTrigger value="search-trends" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Top Searches</span>
            </TabsTrigger>
          </TabsList>

          {/* Response Time Chart */}
          <TabsContent value="response-time" className="space-y-4">
            <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-sky-600" />
                  Response Time Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                  </div>
                ) : (
                  <div className="h-80">
                    <Line data={responseTimeChartData} options={chartOptions} />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hourly Activity Chart */}
          <TabsContent value="hourly-activity" className="space-y-4">
            <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  Hourly Activity (Last 24 Hours)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                  </div>
                ) : (
                  <div className="h-80">
                    <Bar data={hourlyActivityChartData} options={chartOptions} />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Search Trends Chart */}
          <TabsContent value="search-trends" className="space-y-4">
            <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  Top 5 Search Terms
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                  </div>
                ) : (
                  <div className="h-80">
                    <Bar data={searchTrendsChartData} options={chartOptions} />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Recent Searches Table */}
        <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4 text-sky-600" />
              Recent Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Search Term</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Time</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Response Time</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Results</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData?.recentSearches && analyticsData.recentSearches.length > 0 ? (
                    analyticsData.recentSearches.slice(0, 10).map((search: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">{search?.term || "Unknown"}</td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">
                          {search?.timestamp ? new Date(search.timestamp).toLocaleTimeString() : "N/A"}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            (search?.responseTime ?? 0) < 100
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : (search?.responseTime ?? 0) < 500
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}>
                            {search?.responseTime ?? 0}ms
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{search?.resultsCount ?? 0}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        No recent searches
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
