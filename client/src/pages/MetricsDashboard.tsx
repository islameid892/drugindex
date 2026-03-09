import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Zap, Shield, Database, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';

export default function MetricsDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  // Fetch metrics
  const { data: snapshot, refetch: refetchSnapshot } = trpc.monitoring.snapshot.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const { data: responseTimeMetrics } = trpc.monitoring.responseTime.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const { data: cacheMetrics } = trpc.monitoring.cache.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const { data: report } = trpc.monitoring.report.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval * 2 : false, // Less frequent for heavy report
  });

  // Prepare chart data
  const cacheChartData = cacheMetrics ? [
    { name: 'Hits', value: cacheMetrics.hits, fill: '#10b981' },
    { name: 'Misses', value: cacheMetrics.misses, fill: '#ef4444' },
  ] : [];

  const responseTimeChartData = responseTimeMetrics ? [
    { name: 'Min', value: responseTimeMetrics.min },
    { name: 'Avg', value: responseTimeMetrics.avg },
    { name: 'P95', value: responseTimeMetrics.p95 },
    { name: 'P99', value: responseTimeMetrics.p99 },
    { name: 'Max', value: responseTimeMetrics.max },
  ] : [];

  const requestTypeChartData = snapshot ? [
    { name: 'Search', value: snapshot.searchRequests, fill: '#3b82f6' },
    { name: 'Analytics', value: snapshot.analyticsRequests, fill: '#8b5cf6' },
  ] : [];

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Performance Dashboard</h1>
              <p className="text-slate-600 mt-2">Real-time metrics and performance monitoring</p>
            </div>
            <div className="flex gap-4">
              <Button
                variant={autoRefresh ? 'default' : 'outline'}
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                {autoRefresh ? 'Auto-refreshing' : 'Manual'}
              </Button>
              <Button variant="outline" onClick={() => refetchSnapshot()}>
                Refresh Now
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Requests */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Total Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {snapshot?.totalRequests.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {report?.requestsPerSecond.toFixed(2) || '0'} req/sec
              </p>
            </CardContent>
          </Card>

          {/* Cache Hit Rate */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Database className="h-4 w-4 text-green-500" />
                Cache Hit Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {cacheMetrics?.hitRate.toFixed(1) || '0'}%
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {cacheMetrics?.hits || '0'} hits
              </p>
            </CardContent>
          </Card>

          {/* Avg Response Time */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Avg Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {responseTimeMetrics?.avg.toFixed(1) || '0'}ms
              </div>
              <p className="text-xs text-slate-500 mt-2">
                P99: {responseTimeMetrics?.p99.toFixed(1) || '0'}ms
              </p>
            </CardContent>
          </Card>

          {/* Error Rate */}
          <Card className={`border-0 shadow-lg ${report && report.errorRate > 5 ? 'bg-red-50' : ''}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <AlertCircle className={`h-4 w-4 ${report && report.errorRate > 5 ? 'text-red-500' : 'text-orange-500'}`} />
                Error Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${report && report.errorRate > 5 ? 'text-red-600' : 'text-slate-900'}`}>
                {report?.errorRate.toFixed(2) || '0'}%
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {report?.errorCount || '0'} errors
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Cache Performance */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Cache Performance</CardTitle>
              <CardDescription>Hits vs Misses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={cacheChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {cacheChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Response Time Distribution */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Response Time Distribution</CardTitle>
              <CardDescription>Min, Avg, P95, P99, Max (ms)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={responseTimeChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Request Types and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Request Types */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Request Types</CardTitle>
              <CardDescription>Distribution of request types</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={requestTypeChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {requestTypeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed Stats */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Detailed Statistics</CardTitle>
              <CardDescription>System performance details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-slate-600">Uptime</span>
                  <span className="font-semibold text-slate-900">
                    {report ? Math.floor(report.uptime / 3600) : 0}h {report ? Math.floor((report.uptime % 3600) / 60) : 0}m
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-slate-600">Search Requests</span>
                  <span className="font-semibold text-slate-900">
                    {snapshot?.searchRequests.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-slate-600">Analytics Requests</span>
                  <span className="font-semibold text-slate-900">
                    {snapshot?.analyticsRequests.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-slate-600">Cache Misses</span>
                  <span className="font-semibold text-slate-900">
                    {cacheMetrics?.misses.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Requests/Second</span>
                  <span className="font-semibold text-slate-900">
                    {report?.requestsPerSecond.toFixed(2) || '0'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
