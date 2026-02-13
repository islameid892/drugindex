import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Database, Pill, Activity, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminPanel() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const { data: stats, isLoading } = trpc.data.admin.getStats.useQuery();

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
              <div className="text-2xl font-bold text-slate-900">{isLoading ? '...' : (stats?.medicationsCount ?? 0).toLocaleString()}</div>
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
              <div className="text-2xl font-bold text-slate-900">{isLoading ? '...' : (stats?.conditionsCount ?? 0).toLocaleString()}</div>
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
              <div className="text-2xl font-bold text-slate-900">{isLoading ? '...' : (stats?.codesCount ?? 0).toLocaleString()}</div>
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
              <div className="text-2xl font-bold text-slate-900">{isLoading ? '...' : (stats?.nonCoveredCodesCount ?? 0).toLocaleString()}</div>
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
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
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

              <TabsContent value="medications" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Medications Management</h3>
                  <p className="text-slate-600 mb-4">
                    View and manage medications in the database.
                  </p>
                  <Button disabled>
                    Coming Soon - Medications Editor
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="codes" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">ICD-10 Codes Management</h3>
                  <p className="text-slate-600 mb-4">
                    View and manage ICD-10 codes in the database.
                  </p>
                  <Button disabled>
                    Coming Soon - Codes Editor
                  </Button>
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
