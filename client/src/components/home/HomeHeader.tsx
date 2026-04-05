import { Button } from "@/components/ui/button";
import { Stethoscope, Pill, Activity, Database, BarChart3, Heart, Moon, Sun, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useTheme } from "@/contexts/ThemeContext";

interface HomeHeaderProps {
  stats: {
    medications: number;
    conditions: number;
    codes: number;
  };
  isStale?: boolean;
}

export function HomeHeader({ stats, isStale = false }: HomeHeaderProps) {
  const { favorites } = useFavorites();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="bg-gradient-to-br from-sky-500 to-sky-600 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-lg shadow-sky-500/40 flex-shrink-0 hover:shadow-xl hover:shadow-sky-500/50 transition-all duration-300">
              <Stethoscope className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <div className="flex-1 sm:flex-none">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight leading-tight">ICD-10 Search Engine</h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Drug Reference & Medical Coding</p>
              <p className="text-xs mt-0.5 sm:mt-1 font-semibold bg-gradient-to-r from-sky-600 via-emerald-600 to-sky-600 bg-clip-text text-transparent">Created By Pharmacist: Islam Mostafa Eid</p>
            </div>
          </div>
          
          {/* Desktop Stats and Favorites */}
          <div className="flex items-center gap-3 text-xs font-medium text-foreground hidden md:flex">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950 transition-opacity duration-300 ${isStale ? 'opacity-60' : 'opacity-100'}`}>
              <Pill className="h-4 w-4 text-sky-600" />
              <span className="font-semibold text-sky-900 dark:text-sky-100">{stats.medications.toLocaleString()}</span>
              <span className="text-sky-700 dark:text-sky-300">Meds</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 transition-opacity duration-300 ${isStale ? 'opacity-60' : 'opacity-100'}`}>
              <Activity className="h-4 w-4 text-emerald-600" />
              <span className="font-semibold text-emerald-900 dark:text-emerald-100">{stats.conditions.toLocaleString()}</span>
              <span className="text-emerald-700 dark:text-emerald-300">Conditions</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950 transition-opacity duration-300 ${isStale ? 'opacity-60' : 'opacity-100'}`}>
              <Database className="h-4 w-4 text-purple-600" />
              <span className="font-semibold text-purple-900 dark:text-purple-100">{stats.codes.toLocaleString()}</span>
              <span className="text-purple-700 dark:text-purple-300">Codes</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="gap-2"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </Button>
            <Link href="/metrics">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950"
                title="Performance Metrics Dashboard"
              >
                <TrendingUp className="h-4 w-4" />
                Metrics
              </Button>
            </Link>
            <Link href="/favorites">
              <Button variant="outline" size="sm" className="gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950">
                <Heart className="h-4 w-4" />
                <span className="font-semibold">{favorites.length}</span>
              </Button>
            </Link>
          </div>

          {/* Mobile Stats and Favorites */}
          <div className="flex items-center gap-2 text-xs font-medium text-foreground sm:hidden">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-950">
              <Pill className="h-3 w-3 text-sky-600" />
              <span className="font-semibold text-sky-900 dark:text-sky-100 text-xs">{stats.medications}</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950">
              <Activity className="h-3 w-3 text-emerald-600" />
              <span className="font-semibold text-emerald-900 dark:text-emerald-100 text-xs">{stats.conditions}</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-950">
              <Database className="h-3 w-3 text-purple-600" />
              <span className="font-semibold text-purple-900 dark:text-purple-100 text-xs">{stats.codes}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="h-8 px-2"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-3 w-3" />
              ) : (
                <Moon className="h-3 w-3" />
              )}
            </Button>
            <Link href="/metrics">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950 h-8 px-2"
                title="Performance Metrics"
              >
                <TrendingUp className="h-3 w-3" />
              </Button>
            </Link>
            <Link href="/favorites">
              <Button variant="outline" size="sm" className="gap-1 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950 h-8 px-2">
                <Heart className="h-3 w-3" />
                <span className="font-semibold text-xs">{favorites.length}</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
