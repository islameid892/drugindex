import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, Search, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function AdminPanel() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("medications");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    scientificName: "",
    tradeNames: "",
    indication: "",
    icdCodes: "",
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = "/";
    }
  }, [loading, isAuthenticated]);

  // Redirect if not admin
  useEffect(() => {
    if (!loading && isAuthenticated && user?.role !== "admin") {
      window.location.href = "/";
    }
  }, [loading, isAuthenticated, user?.role]);

  // tRPC queries
  const medicationsQuery = trpc.admin.getAllMedications.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  // tRPC mutations
  const addMedicationMutation = trpc.admin.addMedication.useMutation({
    onSuccess: () => {
      toast.success("Medication added successfully");
      medicationsQuery.refetch();
      setFormData({ scientificName: "", tradeNames: "", indication: "", icdCodes: "" });
      setShowAddForm(false);
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMedicationMutation = trpc.admin.deleteMedication.useMutation({
    onSuccess: () => {
      toast.success("Medication deleted successfully");
      medicationsQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

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

  const handleAddMedication = async () => {
    if (!formData.scientificName.trim()) {
      toast.error("Please enter scientific name");
      return;
    }

    try {
      await addMedicationMutation.mutateAsync({
        scientificName: formData.scientificName,
        tradeName: formData.tradeNames,
        indication: formData.indication,
        icdCodesRaw: formData.icdCodes,
        icdCodesList: formData.icdCodes.split(",").map((s) => s.trim()).filter(Boolean),
      });
    } catch (error) {
      console.error("Error adding medication:", error);
    }
  };

  const handleDeleteMedication = (id: number) => {
    if (confirm("Are you sure you want to delete this medication?")) {
      deleteMedicationMutation.mutate({ id });
    }
  };

  const medications = medicationsQuery.data || [];
  const filteredMedications = medications.filter((med: any) =>
    med.scientificName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-sm text-slate-600">Manage medications, conditions, and codes</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              Welcome, <strong>{user?.name || user?.email}</strong>
            </span>
            <Button onClick={() => logout()} variant="outline" className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Medications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-sky-600">{medications.length}</div>
              <p className="text-xs text-slate-500 mt-1">In database</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">540</div>
              <p className="text-xs text-slate-500 mt-1">In database</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total ICD-10 Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">40,316</div>
              <p className="text-xs text-slate-500 mt-1">In database</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="conditions">Conditions</TabsTrigger>
            <TabsTrigger value="codes">ICD-10 Codes</TabsTrigger>
          </TabsList>

          {/* Medications Tab */}
          <TabsContent value="medications" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Medications Management</CardTitle>
                    <CardDescription>Add, edit, and delete medications</CardDescription>
                  </div>
                  <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Medication
                  </Button>
                </div>
              </CardHeader>

              {/* Add Form */}
              {showAddForm && (
                <CardContent className="border-t pt-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Scientific Name *</label>
                      <Input
                        placeholder="e.g., Paracetamol"
                        value={formData.scientificName}
                        onChange={(e) =>
                          setFormData({ ...formData, scientificName: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Trade Names (comma-separated)</label>
                      <Input
                        placeholder="e.g., Panadol, Tylenol"
                        value={formData.tradeNames}
                        onChange={(e) =>
                          setFormData({ ...formData, tradeNames: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Indication</label>
                      <Input
                        placeholder="e.g., Pain relief"
                        value={formData.indication}
                        onChange={(e) =>
                          setFormData({ ...formData, indication: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">ICD-10 Codes (comma-separated)</label>
                      <Input
                        placeholder="e.g., R51, R50.9"
                        value={formData.icdCodes}
                        onChange={(e) =>
                          setFormData({ ...formData, icdCodes: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleAddMedication}
                        disabled={addMedicationMutation.isPending}
                      >
                        {addMedicationMutation.isPending ? "Adding..." : "Add Medication"}
                      </Button>
                      <Button onClick={() => setShowAddForm(false)} variant="outline">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}

              {/* Search */}
              <CardContent className="border-t pt-6">
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search medications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Medications List */}
                <div className="space-y-3">
                  {medicationsQuery.isLoading ? (
                    <div className="text-center py-8 text-slate-500">Loading medications...</div>
                  ) : filteredMedications.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">No medications found</div>
                  ) : (
                    filteredMedications.map((med: any) => (
                      <div
                        key={med.id}
                        className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">{med.scientificName}</h3>
                          {med.tradeNames && (
                            <p className="text-sm text-slate-600 mt-1">
                              Trade names: {Array.isArray(med.tradeNames) ? med.tradeNames.join(", ") : med.tradeNames}
                            </p>
                          )}
                          {med.indication && (
                            <p className="text-sm text-slate-600">Indication: {med.indication}</p>
                          )}
                          {med.icdCodes && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {Array.isArray(med.icdCodes)
                                ? med.icdCodes.map((code: string) => (
                                    <Badge key={code} variant="secondary">
                                      {code}
                                    </Badge>
                                  ))
                                : null}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button size="sm" variant="outline" className="gap-1">
                            <Edit2 className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => handleDeleteMedication(med.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conditions Tab */}
          <TabsContent value="conditions">
            <Card>
              <CardHeader>
                <CardTitle>Conditions Management</CardTitle>
                <CardDescription>Coming soon</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-slate-500">
                  Conditions management interface coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Codes Tab */}
          <TabsContent value="codes">
            <Card>
              <CardHeader>
                <CardTitle>ICD-10 Codes Management</CardTitle>
                <CardDescription>Coming soon</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-slate-500">
                  ICD-10 codes management interface coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
