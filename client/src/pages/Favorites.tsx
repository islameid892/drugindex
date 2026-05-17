import { useEffect, useState } from "react";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, LayoutGrid, List, Trash2, ChevronLeft } from "lucide-react";
import { Link } from "wouter";

export default function Favorites() {
  const { favorites, removeFavorite, clearFavorites } = useFavorites();
  const [viewMode, setViewMode] = useState<"aggregated" | "detailed">("aggregated");

  // ✅ Add noindex meta tag for this user-only page
  useEffect(() => {
    const noindexMeta = document.createElement('meta');
    noindexMeta.name = 'robots';
    noindexMeta.content = 'noindex, nofollow';
    document.head.appendChild(noindexMeta);

    return () => {
      document.head.removeChild(noindexMeta);
    };
  }, []);

  if (favorites.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/95 backdrop-blur-md shadow-sm">
          <div className="container py-4">
            <Link href="/">
              <a className="flex items-center gap-2 text-sky-600 hover:text-sky-700 font-semibold mb-4">
                <ChevronLeft className="h-5 w-5" />
                Back to Search
              </a>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Favorites</h1>
            <p className="text-sm text-slate-500 font-medium">Your saved medications and codes</p>
          </div>
        </header>

        <main className="flex-1 container py-12">
          <div className="text-center py-20 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 shadow-sm">
            <div className="bg-gradient-to-br from-slate-200 to-slate-300 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
              <Heart className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No favorites yet</h3>
            <p className="text-slate-600 mt-2 max-w-md mx-auto">Start adding your favorite medications and codes to see them here.</p>
            <Link href="/">
              <Button className="mt-6 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700">
                Go to Search
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="container py-4">
          <Link href="/">
            <a className="flex items-center gap-2 text-sky-600 hover:text-sky-700 font-semibold mb-4">
              <ChevronLeft className="h-5 w-5" />
              Back to Search
            </a>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Favorites</h1>
              <p className="text-sm text-slate-500 font-medium">{favorites.length} saved item{favorites.length !== 1 ? 's' : ''}</p>
            </div>
            <Badge className="bg-red-100 text-red-700 border-red-300 text-lg px-3 py-1">
              <Heart className="h-4 w-4 mr-1 fill-current" />
              {favorites.length}
            </Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-12 space-y-6">
        {/* View Toggle and Clear Button */}
        <div className="flex items-center justify-between">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-auto">
            <TabsList className="grid w-full grid-cols-2 h-10 bg-slate-100 p-1 rounded-lg">
              <TabsTrigger value="aggregated" className="text-xs gap-2 data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-md rounded-md transition-all">
                <LayoutGrid className="h-4 w-4" /> Cards
              </TabsTrigger>
              <TabsTrigger value="detailed" className="text-xs gap-2 data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-md rounded-md transition-all">
                <List className="h-4 w-4" /> List
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            onClick={clearFavorites}
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>

        {/* Results */}
        {viewMode === "aggregated" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((item) => (
              <Card key={item.id} className="border-slate-200 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-100/50 overflow-hidden transition-all duration-300 group">
                <CardHeader className="pb-3 border-b bg-slate-50/50 border-slate-100">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1.5 flex-1">
                      <CardTitle className="text-lg font-bold text-slate-800 leading-tight group-hover:text-sky-700 transition-colors">
                        {item.scientific_name}
                      </CardTitle>
                      <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs uppercase tracking-wider text-slate-600">Trade Name</span>
                        <span className="text-slate-700 font-semibold">{item.trade_name}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => removeFavorite(item.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Indication</h4>
                    <p className="text-sm font-medium leading-relaxed p-2.5 rounded-lg border bg-slate-50 border-slate-100 text-slate-700">
                      {item.indication}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ICD-10</span>
                      <Badge variant="outline" className="font-mono font-bold text-slate-700 border-slate-300 bg-white">
                        {item.icd10_codes}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-lg">
            <Table>
              <TableHeader className="bg-gradient-to-r from-sky-50 to-emerald-50 border-b border-slate-200">
                <TableRow>
                  <TableHead className="w-[30%] font-semibold text-slate-700">Scientific Name</TableHead>
                  <TableHead className="w-[30%] font-semibold text-slate-700">Indication</TableHead>
                  <TableHead className="w-[25%] font-semibold text-slate-700">ICD-10 Code</TableHead>
                  <TableHead className="w-[15%] font-semibold text-slate-700">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {favorites.map((item) => (
                  <TableRow key={item.id} className="hover:bg-sky-50/30 transition-colors group">
                    <TableCell className="font-medium text-slate-900">
                      <div className="flex flex-col">
                        <span className="font-bold group-hover:text-sky-700 transition-colors">{item.scientific_name}</span>
                        <span className="text-xs text-slate-500 font-normal">Trade Name: {item.trade_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-slate-700" title={item.indication}>
                      {item.indication}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono bg-white text-slate-700 border-slate-300">
                        {item.icd10_codes}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={() => removeFavorite(item.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}
