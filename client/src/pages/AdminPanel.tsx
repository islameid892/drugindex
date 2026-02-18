import { useAuth } from "@/_core/hooks/useAuth";
import { useRouter } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users, Database, Settings, LogOut, AlertCircle, CheckCircle2, Activity } from "lucide-react";
import { toast } from "sonner";

export default function AdminPanel() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== "admin")) {
      toast.error("Access Denied: Admin privileges required");
      window.location.href = "/";
    }
  }, [loading, isAuthenticated, user, router]);

  const statsQuery = trpc.admin.getSystemStats.useQuery();
  const usersQuery = trpc.admin.getAllUsers.useQuery();
  const auditLogsQuery = trpc.admin.getAuditLogs.useQuery({ limit: 50 });
  const medicationsQuery = trpc.admin.getAllMedications.useQuery();
  const conditionsQuery = trpc.admin.getAllConditions.useQuery();
  const codesQuery = trpc.admin.getAllCodes.useQuery();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

  const stats = statsQuery.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-2.5 rounded-lg shadow-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
              <p className="text-sm text-slate-600">System Management & Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-600">Owner</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logout();
                window.location.href = "/";
              }}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="database" className="gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Database</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Audit</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-blue-900">Total Searches</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{stats?.totalSearches.toLocaleString() || 0}</div>
                  <p className="text-xs text-blue-700 mt-1">All-time searches</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-emerald-900">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600">{stats?.users.toLocaleString() || 0}</div>
                  <p className="text-xs text-emerald-700 mt-1">Registered users</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-purple-900">Medications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">{stats?.medications.toLocaleString() || 0}</div>
                  <p className="text-xs text-purple-700 mt-1">In database</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-orange-900">Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">{stats?.conditions.toLocaleString() || 0}</div>
                  <p className="text-xs text-orange-700 mt-1">Medical conditions</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-pink-900">ICD-10 Codes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-pink-600">{stats?.codes.toLocaleString() || 0}</div>
                  <p className="text-xs text-pink-700 mt-1">Medical codes</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Current system status and performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-emerald-900">Database Connection</p>
                      <p className="text-sm text-emerald-700">Connected and operational</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-600">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-emerald-900">API Server</p>
                      <p className="text-sm text-emerald-700">All systems operational</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-600">Healthy</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage system users and their roles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Role</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersQuery.data?.map((u) => (
                        <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4">{u.name || "N/A"}</td>
                          <td className="py-3 px-4">{u.email || "N/A"}</td>
                          <td className="py-3 px-4">
                            <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                              {u.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Medications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold text-purple-600">
                    {medicationsQuery.data?.length || 0}
                  </div>
                  <p className="text-sm text-slate-600">Total medications in database</p>
                  <Button variant="outline" className="w-full" disabled>
                    Manage Medications
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Conditions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold text-orange-600">
                    {conditionsQuery.data?.length || 0}
                  </div>
                  <p className="text-sm text-slate-600">Total conditions in database</p>
                  <Button variant="outline" className="w-full" disabled>
                    Manage Conditions
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ICD-10 Codes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold text-pink-600">
                    {codesQuery.data?.length || 0}
                  </div>
                  <p className="text-sm text-slate-600">Total ICD-10 codes in database</p>
                  <Button variant="outline" className="w-full" disabled>
                    Manage Codes
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>Track all administrative actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {auditLogsQuery.data && auditLogsQuery.data.length > 0 ? (
                    auditLogsQuery.data.map((log) => (
                      <div key={log.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-slate-900">{log.action}</p>
                            <p className="text-xs text-slate-600">
                              {log.entityType} {log.entityId && `#${log.entityId}`}
                            </p>
                          </div>
                          <p className="text-xs text-slate-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600">No audit logs yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Configure system-wide settings and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <h3 className="font-medium text-slate-900 mb-2">Database Maintenance</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Perform database optimization and maintenance tasks
                    </p>
                    <Button variant="outline" disabled>
                      Run Maintenance
                    </Button>
                  </div>

                  <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <h3 className="font-medium text-slate-900 mb-2">Backup & Export</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Export database and system data for backup purposes
                    </p>
                    <Button variant="outline" disabled>
                      Export Data
                    </Button>
                  </div>

                  <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <h3 className="font-medium text-slate-900 mb-2">System Logs</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      View and manage system logs and error reports
                    </p>
                    <Button variant="outline" disabled>
                      View Logs
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
