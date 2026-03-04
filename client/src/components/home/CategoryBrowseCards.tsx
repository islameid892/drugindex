import { Pill, Activity, Database, Upload, Search, ChevronRight } from "lucide-react";

interface CategoryBrowseCardsProps {
  onBrowseDrugs: () => void;
  onBrowseConditions: () => void;
  onBrowseCodes: () => void;
  onBulkVerify: () => void;
  onBrowseNonCovered: () => void;
}

export function CategoryBrowseCards({
  onBrowseDrugs,
  onBrowseConditions,
  onBrowseCodes,
  onBulkVerify,
  onBrowseNonCovered,
}: CategoryBrowseCardsProps) {
  return (
    <div className="mt-12 pt-8 border-t border-sky-200 dark:border-sky-800">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-foreground mb-2">Browse by Category</h3>
        <p className="text-muted-foreground">Quick access to drugs, conditions, and codes</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
        {/* Search Drugs Card */}
        <button
          onClick={onBrowseDrugs}
          className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-950 dark:to-sky-900 border border-sky-200 dark:border-sky-800 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-sky-300 dark:hover:border-sky-700"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative space-y-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <Pill className="h-7 w-7 text-white" />
            </div>
            
            <div className="text-left">
              <h4 className="text-lg font-bold text-foreground group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">Search Drugs</h4>
              <p className="text-sm text-muted-foreground mt-1">Browse all medications alphabetically</p>
            </div>
            
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
              Explore <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </button>
        
        {/* Find Conditions Card */}
        <button
          onClick={onBrowseConditions}
          className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border border-emerald-200 dark:border-emerald-800 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-emerald-300 dark:hover:border-emerald-700"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative space-y-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <Activity className="h-7 w-7 text-white" />
            </div>
            
            <div className="text-left">
              <h4 className="text-lg font-bold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">Find Conditions</h4>
              <p className="text-sm text-muted-foreground mt-1">Discover medical conditions and diagnoses</p>
            </div>
            
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
              Explore <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </button>
        
        {/* Browse Codes Card */}
        <button
          onClick={onBrowseCodes}
          className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border border-purple-200 dark:border-purple-800 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-purple-300 dark:hover:border-purple-700"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative space-y-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <Database className="h-7 w-7 text-white" />
            </div>
            
            <div className="text-left">
              <h4 className="text-lg font-bold text-foreground group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">Browse Codes</h4>
              <p className="text-sm text-muted-foreground mt-1">View all ICD-10 AM codes and classifications</p>
            </div>
            
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
              Explore <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </button>

        {/* Bulk Verification Card */}
        <button
          onClick={onBulkVerify}
          className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border border-orange-200 dark:border-orange-800 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-orange-300 dark:hover:border-orange-700"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative space-y-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <Upload className="h-7 w-7 text-white" />
            </div>
            
            <div className="text-left">
              <h4 className="text-lg font-bold text-foreground group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors">Bulk Verify</h4>
              <p className="text-sm text-muted-foreground mt-1">Check multiple codes at once</p>
            </div>
            
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
              Verify <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </button>

        {/* Non-Covered Codes Card */}
        <button
          onClick={onBrowseNonCovered}
          className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border border-red-200 dark:border-red-800 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-red-300 dark:hover:border-red-700"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative space-y-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <Search className="h-7 w-7 text-white" />
            </div>
            
            <div className="text-left">
              <h4 className="text-lg font-bold text-foreground group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors">Non-Covered Codes</h4>
              <p className="text-sm text-muted-foreground mt-1">Codes not covered by Saudi health insurance</p>
            </div>
            
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
              Explore <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
