import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { AlertCircle, Database, Pill, Activity, Search, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdminDatabaseSearch } from "@/components/AdminDatabaseSearch";
import pako from 'pako';

export default function AdminPanel() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [medicationSearchQuery, setMedicationSearchQuery] = useState("");
  const [medicationResults, setMedicationResults] = useState<any[]>([]);
  const [medicationSearching, setMedicationSearching] = useState(false);
  
  const [codeSearchQuery, setCodeSearchQuery] = useState("");
  const [codeResults, setCodeResults] = useState<any[]>([]);
  const [codeSearching, setCodeSearching] = useState(false);
  const [medicationsData, setMedicationsData] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  const { data: stats, isLoading } = trpc.data.admin.getStats.useQuery();

  // Load medications data for the database search
  useEffect(() => {{
    const loadData = async () => {{
      setLoadingData(true);
      try {{
        const response = await fetch('/data/main_data.json');
        const data = await response.json();
        setMedicationsData(data);
      }} catch (error) {{
        console.error('Failed to load medications data:', error);
      }} finally {{
        setLoadingData(false);
      }}
    }};
    loadData();
  }}, []);

  // Check if user is admin (you'll need to add role field to user)
  const isAdmin = user?.role === "admin" || user?.email?.includes("admin");

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to access the admin panel</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You need to be logged in to access this page.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>You don't have permission to access this page</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Only administrators can access the admin panel.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleMedicationSearch = useCallback(async () => {
    if (!medicationSearchQuery.trim()) return;
    setMedicationSearching(true);
    try {
      const results = await fetch("/api/trpc/data.medications.search?input=" + encodeURIComponent(JSON.stringify({ query: medicationSearchQuery }))).then(r => r.json());
      setMedicationResults(results.result?.data || []);
    } catch (error) {
      console.error("Search failed:", error);
      setMedicationResults([]);
    } finally {
      setMedicationSearching(false);
    }
  }, [medicationSearchQuery]);

  const handleCodeSearch = useCallback(async () => {
    if (!codeSearchQuery.trim()) return;
    setCodeSearching(true);
    try {
      const results = await fetch("/api/trpc/data.codes.search?input=" + encodeURIComponent(JSON.stringify({ query: codeSearchQuery }))).then(r => r.json());
      setCodeResults(results.result?.data || []);
    } catch (error) {
      console.error("Search failed:", error);
      setCodeResults([]);
    } finally {
      setCodeSearching(false);
    }
  }, [codeSearchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-slate-900">Admin Panel</h1>
          <p className="text-slate-600">Manage medications, conditions, and ICD-10 codes</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Pill className="h-4 w-4" />
                Medications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{isLoading ? "..." : (stats?.medicationsCount ?? 0).toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">Total medications</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{isLoading ? "..." : (stats?.conditionsCount ?? 0).toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">Total conditions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Search className="h-4 w-4" />
                ICD-10 Codes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{isLoading ? "..." : (stats?.codesCount ?? 0).toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">Total codes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Non-Covered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{isLoading ? "..." : (stats?.nonCoveredCodesCount ?? 0).toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">Non-covered codes</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Manage your medical database</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5 overflow-x-auto">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="database-search">DB Search</TabsTrigger>
                <TabsTrigger value="medications">Medications</TabsTrigger>
                <TabsTrigger value="codes">Codes</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Database Overview</h3>
                  <p className="text-slate-600">
                    The database contains comprehensive medical information including medications, conditions, and ICD-10 codes.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-base">Data Source</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-slate-700">
                          Currently loading from JSON files. Database is ready for data migration.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-green-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-base">Next Steps</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-slate-700">
                          Run migration script to populate database with JSON data.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="database-search" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Advanced Database Search</h3>
                  <p className="text-slate-600 mb-4">
                    Search, filter, and export medications from the database with advanced filtering options.
                  </p>
                  
                  {loadingData ? (
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-slate-600">Loading medications data...</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <AdminDatabaseSearch data={medicationsData} />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="medications" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Medications Management</h3>
                  <p className="text-slate-600 mb-4">
                    Search and view medications in the database.
                  </p>
                  
                  {/* Search Box */}
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search by trade name, scientific name, or indication..."
                        value={medicationSearchQuery}
                        onChange={(e) => setMedicationSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleMedicationSearch()}
                        className="pl-10"
                      />
                      {medicationSearchQuery && (
                        <button
                          onClick={() => {
                            setMedicationSearchQuery("");
                            setMedicationResults([]);
                          }}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <Button
                      onClick={handleMedicationSearch}
                      disabled={!medicationSearchQuery.trim() || medicationSearching}
                    >
                      {medicationSearching ? "Searching..." : "Search"}
                    </Button>
                  </div>

                  {/* Search Results */}
                  {medicationResults.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <h4 className="font-semibold text-slate-900">Results ({medicationResults.length})</h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {medicationResults.map((med, idx) => (
                          <Card key={idx} className="p-4">
                            <div className="space-y-2">
                              <div>
                                <p className="font-medium text-slate-900">{med.tradeNames?.join(", ") || "N/A"}</p>
                                <p className="text-sm text-slate-600">{med.scientificName}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {med.indication || "No indication"}
                                </span>
                                {med.icdCodes?.map((code: string) => (
                                  <span key={code} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                    {code}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {medicationSearchQuery && medicationResults.length === 0 && !medicationSearching && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No medications found matching "{medicationSearchQuery}"
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="codes" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">ICD-10 Codes Management</h3>
                  <p className="text-slate-600 mb-4">
                    Search and view ICD-10 codes in the database.
                  </p>
                  
                  {/* Search Box */}
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search by code or description..."
                        value={codeSearchQuery}
                        onChange={(e) => setCodeSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleCodeSearch()}
                        className="pl-10"
                      />
                      {codeSearchQuery && (
                        <button
                          onClick={() => {
                            setCodeSearchQuery("");
                            setCodeResults([]);
                          }}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <Button
                      onClick={handleCodeSearch}
                      disabled={!codeSearchQuery.trim() || codeSearching}
                    >
                      {codeSearching ? "Searching..." : "Search"}
                    </Button>
                  </div>

                  {/* Search Results */}
                  {codeResults.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <h4 className="font-semibold text-slate-900">Results ({codeResults.length})</h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {codeResults.map((code, idx) => (
                          <Card key={idx} className="p-4">
                            <div className="space-y-2">
                              <div>
                                <p className="font-medium text-slate-900">{code.code}</p>
                                <p className="text-sm text-slate-600">{code.description || "No description"}</p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {codeSearchQuery && codeResults.length === 0 && !codeSearching && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No codes found matching "{codeSearchQuery}"
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Database Settings</h3>
                  <p className="text-slate-600 mb-4">
                    Configure database and migration settings.
                  </p>
                  
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full">
                      Run Data Migration
                    </Button>
                    <Button variant="outline" className="w-full">
                      Export Database to JSON
                    </Button>
                    <Button variant="outline" className="w-full">
                      Clear Database
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
