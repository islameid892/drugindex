import { useEffect, useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
Search, Users, Zap, Target, Database, Pill,
Activity, TrendingUp, RefreshCw, ArrowLeft,
Clock, BarChart3, CheckCircle2, XCircle,
} from "lucide-react";
import { useLocation } from "wouter";

// Types
interface WeeklyTrend  { date: string; count: number }
interface TopSearch    { term: string; count: number }
interface RecentSearch { term: string; createdAt: string | Date; hasResults: boolean }
interface DbSummary    { icd10Count: number; medicationsCount: number; conditionsCount: number; coverageRate: number }
interface AnalyticsData {
totalSearches: number; searchesToday: number; searchesThisWeek: number;
registeredUsers: number; avgResponseTime: number;
coverageRate: number; coveredCount: number; totalCount: number;
weeklyTrends: WeeklyTrend[]; topSearches: TopSearch[];
recentSearches: RecentSearch[]; dbSummary: DbSummary;
timestamp: string | Date;
}

// Animated counter hook
function useAnimatedCounter(target: number, duration = 900) {
const [value, setValue] = useState(0);
const prevRef = useRef(0);
useEffect(() => {
const start = prevRef.current;
const diff = target - start;
if (diff === 0) {
setValue(target);
return;
}
const t0 = performance.now();
let animationId: number;
const tick = (now: number) => {
const p = Math.min((now - t0) / duration, 1);
const ease = 1 - Math.pow(1 - p, 3);
setValue(Math.round(start + diff * ease));
if (p < 1) {
animationId = requestAnimationFrame(tick);
} else {
prevRef.current = target;
setValue(target);
}
};
animationId = requestAnimationFrame(tick);
return () => cancelAnimationFrame(animationId);
}, [target, duration]);
return value;
}

// Sparkline SVG
function Sparkline({ data, color = "#38bdf8" }: { data: number[]; color?: string }) {
if (!data || data.length < 2) return null;
const max = Math.max(...data, 1);
const W = 72; const H = 34;
const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * (H - 2) - 1}`).join(" ");
const area = `M0,${H} ${pts.split(" ").map((p) => `L${p}`).join(" ")} L${W},${H} Z`;
const id = `sg${color.replace(/[^a-z0-9]/gi, "")}`;
return (
<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="opacity-60 shrink-0">
<defs>
<linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stopColor={color} stopOpacity="0.35" />
<stop offset="100%" stopColor={color} stopOpacity="0" />
</linearGradient>
</defs>
<path d={area} fill={`url(#${id})`} />
<polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
</svg>
);
}

// Coverage progress bar
function CoverageBar({ value }: { value: number }) {
const color = value >= 80 ? "#22c55e" : value >= 50 ? "#f59e0b" : "#ef4444";
return (
<div className="mt-3 space-y-1">
<div className="flex justify-between text-xs text-slate-400">
<span>Search success rate</span>
<span style={{ color }}>{value}%</span>
</div>
<div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
<div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${value}%`, background: color }} />
</div>
</div>
);
}

// Skeleton card
function SkeletonCard() {
return (
<Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
<CardContent className="p-5">
<div className="animate-pulse space-y-3">
<div className="h-3 bg-slate-200 dark:bg-slate-600 rounded w-1/2" />
<div className="h-8 bg-slate-200 dark:bg-slate-600 rounded w-1/3" />
<div className="h-3 bg-slate-200 dark:bg-slate-600 rounded w-2/3" />
</div>
</CardContent>
</Card>
);
}

// Countdown ring
const REFRESH_INTERVAL = 30;
function CountdownRing({ countdown }: { countdown: number }) {
const r = 14;
const circ = 2 * Math.PI * r;
const offset = circ * (1 - countdown / REFRESH_INTERVAL);
return (
<div className="relative flex items-center justify-center w-9 h-9">
<svg className="absolute inset-0 -rotate-90" width="36" height="36">
<circle cx="18" cy="18" r={r} fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
<circle cx="18" cy="18" r={r} fill="none" stroke="#0ea5e9" strokeWidth="2.5"
strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
className="transition-all duration-1000" />
</svg>
<span className="text-[10px] font-bold text-sky-500">{countdown}</span>
</div>
);
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Analytics() {
const [, setLocation] = useLocation();                         // ✅ بدون useAuth
const [isRefreshing, setIsRefreshing] = useState(false);
const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);
const [countdown, setCountdown]       = useState(REFRESH_INTERVAL);
const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

const query = trpc.analytics.getAnalytics.useQuery(undefined, {
refetchInterval: REFRESH_INTERVAL * 1000,
refetchIntervalInBackground: true,
onSuccess: () => { setLastUpdated(new Date()); setCountdown(REFRESH_INTERVAL); },
});

const data = query.data as AnalyticsData | undefined;

// ✅ مفيش auth guard - الصفحة عامة للكل

useEffect(() => {
if (countdownRef.current) clearInterval(countdownRef.current);
countdownRef.current = setInterval(
() => setCountdown((c) => (c <= 1 ? REFRESH_INTERVAL : c - 1)), 1000,
);
return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
}, [lastUpdated]);

const handleRefresh = useCallback(() => {
setIsRefreshing(true);
query.refetch().finally(() => setTimeout(() => setIsRefreshing(false), 600));
}, [query]);

// Animated counters
const animTotal    = useAnimatedCounter(data?.totalSearches    ?? 0);
const animToday    = useAnimatedCounter(data?.searchesToday    ?? 0);
const animWeek     = useAnimatedCounter(data?.searchesThisWeek ?? 0);
const animUsers    = useAnimatedCounter(data?.registeredUsers  ?? 0);
const animResponse = useAnimatedCounter(data?.avgResponseTime  ?? 0);
const animCoverage = useAnimatedCounter(data?.coverageRate     ?? 0);
const animIcd10    = useAnimatedCounter(data?.dbSummary?.icd10Count       ?? 0);
const animMeds     = useAnimatedCounter(data?.dbSummary?.medicationsCount ?? 0);
const animConds    = useAnimatedCounter(data?.dbSummary?.conditionsCount  ?? 0);

const sparkData = data?.weeklyTrends?.map((t) => Number(t.count)) ?? [];

// ✅ بدون authLoading
if (query.isLoading) {
return (
<div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
<div className="container py-8 space-y-6">
<div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-64 animate-pulse" />
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
</div>
</div>
</div>
);
}

if (query.isError || !data) {
return (
<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
<div className="text-center space-y-4">
<XCircle className="h-12 w-12 text-red-400 mx-auto" />
<p className="text-slate-600 dark:text-slate-400 font-medium">Failed to load analytics</p>
<Button onClick={handleRefresh} className="bg-sky-500 hover:bg-sky-600">
<RefreshCw className="h-4 w-4 mr-2" /> Retry
</Button>
</div>
</div>
);
}

const maxTrend = Math.max(...(data.weeklyTrends?.map((t) => t.count) ?? [1]), 1);

return (
<div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">

```
  {/* Header */}
  <div className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur sticky top-0 z-40">
    <div className="container py-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/")}
            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-700 transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">Analytics Dashboard</h1>
            <p className="text-xs text-slate-400">Real-time insights from your database</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="h-3.5 w-3.5" />{lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <CountdownRing countdown={countdown} />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-semibold text-green-600 dark:text-green-400">Live</span>
          </div>
          <Button onClick={handleRefresh} disabled={isRefreshing} size="sm" className="gap-2 bg-sky-500 hover:bg-sky-600 text-white">
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>
      </div>
    </div>
  </div>

  <div className="container py-8 space-y-8">

    {/* KPI Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

      {/* Total Searches */}
      <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700 hover:shadow-xl transition-shadow overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="bg-sky-100 dark:bg-sky-900/50 p-2.5 rounded-xl">
              <Search className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <Sparkline data={sparkData} color="#0ea5e9" />
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Total Searches</p>
          <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
            {animTotal.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 mt-2">{animWeek.toLocaleString()} this week · {animToday} today</p>
        </CardContent>
      </Card>

      {/* Registered Users */}
      <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700 hover:shadow-xl transition-shadow overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2.5 rounded-xl">
              <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Registered Users</p>
          <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
            {animUsers.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 mt-2">All time</p>
        </CardContent>
      </Card>

      {/* Avg Response Time */}
      <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700 hover:shadow-xl transition-shadow overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="bg-amber-100 dark:bg-amber-900/50 p-2.5 rounded-xl">
              <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Avg Response Time</p>
          <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
            {animResponse}
          </div>
          <p className="text-xs text-slate-400 mt-2">ms (last 100 requests)</p>
        </CardContent>
      </Card>

      {/* Coverage Rate */}
      <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700 hover:shadow-xl transition-shadow overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="bg-purple-100 dark:bg-purple-900/50 p-2.5 rounded-xl">
              <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Coverage Rate</p>
          <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
            {animCoverage}%
          </div>
          <CoverageBar value={animCoverage} />
        </CardContent>
      </Card>

    </div>

    {/* Database Summary */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">ICD-10 Codes</p>
            <Database className="h-4 w-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {animIcd10.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Medications</p>
            <Pill className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {animMeds.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Conditions</p>
            <Activity className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {animConds.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Coverage</p>
            <CheckCircle2 className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {data?.coverageRate ?? 0}%
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Tabs */}
    <Tabs defaultValue="trends" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-800">
        <TabsTrigger value="trends" className="gap-2">
          <TrendingUp className="h-4 w-4" /> Trends
        </TabsTrigger>
        <TabsTrigger value="top" className="gap-2">
          <BarChart3 className="h-4 w-4" /> Top
        </TabsTrigger>
        <TabsTrigger value="recent" className="gap-2">
          <Clock className="h-4 w-4" /> Recent
        </TabsTrigger>
      </TabsList>

      {/* Weekly Trends */}
      <TabsContent value="trends">
        <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">Weekly Search Trends</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.weeklyTrends?.map((trend) => (
              <div key={trend.date} className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-20">{trend.date}</span>
                <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-500"
                    style={{ width: `${(trend.count / maxTrend) * 100}%` }} />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white w-12 text-right">
                  {trend.count}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Top Searches */}
      <TabsContent value="top">
        <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">Top 10 Searches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.topSearches?.map((search, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xs font-bold text-slate-400 w-6 text-center">#{i + 1}</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{search.term}</span>
                  </div>
                  <span className="text-sm font-bold text-sky-600 dark:text-sky-400 ml-2">{search.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Recent Searches */}
      <TabsContent value="recent">
        <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">Recent Searches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data?.recentSearches?.map((search, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {search.hasResults ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{search.term}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(search.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
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
