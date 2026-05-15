import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Stethoscope, Pill, Activity, Database, Moon, Sun, Menu, X, FileText, Info, Mail, Wrench, Heart, FolderOpen, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";

interface HomeHeaderProps {
  stats: {
    medications: number;
    conditions: number;
    codes: number;
  };
  isStale?: boolean;
}

const sidebarLinks = [
  { href: "/bupa-prerequisites", label: "Bupa Prerequisites", icon: FileText, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950" },
  { href: "/favorites", label: "Favorites", icon: Heart, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950" },
  { href: "/tools", label: "Tools", icon: Wrench, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950" },
  { href: "/about", label: "About Us", icon: Info, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-950" },
  { href: "/contact", label: "Contact", icon: Mail, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950" },
];

export function HomeHeader({ stats, isStale = false }: HomeHeaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="bg-gradient-to-br from-sky-500 to-sky-600 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-lg shadow-sky-500/40 flex-shrink-0">
                <Stethoscope className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div className="flex-1 sm:flex-none">
                <h1 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight leading-tight">ICD-10 Search Engine</h1>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Drug Reference & Medical Coding</p>
                <p className="text-xs mt-0.5 sm:mt-1 font-semibold bg-gradient-to-r from-sky-600 via-emerald-600 to-sky-600 bg-clip-text text-transparent">Created By Pharmacist: Islam Mostafa Eid</p>
              </div>
            </div>
            
            {/* Desktop Stats and Actions */}
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
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
              </Button>

              {/* Hamburger Menu Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="gap-2"
                title="Open Menu"
              >
                <Menu className="h-4 w-4" />
                <span className="hidden sm:inline">Menu</span>
              </Button>
            </div>

            {/* Mobile Actions */}
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
              >
                {theme === 'dark' ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
              </Button>
              {/* Mobile Hamburger */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="h-8 px-2"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-background border-l border-border shadow-2xl transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-sky-500 to-sky-600 p-2 rounded-lg">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-foreground text-sm">Navigation</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Sidebar Links */}
        <nav className="p-4 space-y-1">
          {sidebarLinks.map(({ href, label, icon: Icon, color, bg }) => (
            <Link key={href} href={href}>
              <button
                onClick={() => setSidebarOpen(false)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                  location === href
                    ? `${bg} ${color} font-semibold`
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${bg}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </Link>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            ICD-10 Search Engine
          </p>
          <p className="text-xs text-muted-foreground text-center mt-0.5">
            By Pharmacist: Islam Mostafa Eid
          </p>
        </div>
      </aside>
    </>
  );
}
