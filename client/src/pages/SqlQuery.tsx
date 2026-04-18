import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Copy, Play, Database, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SqlQuery() {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(100);
  const [results, setResults] = useState<any[] | null>(null);
  const [selectedSample, setSelectedSample] = useState("");

  const executeMutation = trpc.sqlQuery.executeQuery.useMutation();
  const statsQuery = trpc.sqlQuery.getTableStats.useQuery();
  const samplesQuery = trpc.sqlQuery.getSampleQueries.useQuery();

  const handleExecute = async () => {
    if (!query.trim()) {
      toast.error("Please enter a SQL query");
      return;
    }

    try {
      const result = await executeMutation.mutateAsync({
        query: query.trim(),
        limit,
      });

      setResults(result.rows);
      toast.success(`Query executed. ${result.rowCount} rows returned.`);
    } catch (error: any) {
      toast.error(error.message || "Failed to execute query");
    }
  };

  const handleUseSample = (sampleQuery: string) => {
    setQuery(sampleQuery);
    setSelectedSample(sampleQuery);
  };

  const handleCopyQuery = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Query copied to clipboard");
  };

  const handleCopyResults = () => {
    if (results) {
      const csv = [
        Object.keys(results[0]).join(","),
        ...results.map(row =>
          Object.values(row)
            .map(v => (typeof v === "string" ? `"${v}"` : v))
            .join(",")
        ),
      ].join("\n");

      navigator.clipboard.writeText(csv);
      toast.success("Results copied as CSV");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-lg">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">SQL Query Tool</h1>
              <p className="text-slate-600">Execute read-only SQL queries on the database</p>
            </div>
          </div>
        </div>

        {/* Alert */}
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Security Notice:</strong> Only SELECT queries are allowed. No modifications, deletions, or dangerous operations are permitted.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Query Editor */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Query Editor</CardTitle>
                <CardDescription>Enter your SQL SELECT query</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    SQL Query
                  </label>
                  <Textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="SELECT * FROM drug_entries LIMIT 10"
                    className="font-mono text-sm min-h-32"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Result Limit
                    </label>
                    <Input
                      type="number"
                      value={limit}
                      onChange={(e) => setLimit(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
                      min="1"
                      max="1000"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleExecute}
                  disabled={executeMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {executeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Execute Query
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            {results && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Results</CardTitle>
                    <CardDescription>{results.length} rows returned</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyResults}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy as CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          {Object.keys(results[0] || {}).map((key) => (
                            <th key={key} className="px-4 py-2 text-left font-semibold text-slate-700">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                            {Object.values(row).map((value: any, colIdx) => (
                              <td key={colIdx} className="px-4 py-2 text-slate-700">
                                {typeof value === "object" ? JSON.stringify(value) : String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Table Stats */}
            {statsQuery.data && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Table Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(statsQuery.data.stats).map(([table, data]: [string, any]) => (
                    <div key={table} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                      <span className="text-sm font-medium text-slate-700">{table}</span>
                      <span className="text-sm font-semibold text-blue-600">{data.count.toLocaleString()}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Sample Queries */}
            {samplesQuery.data && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sample Queries</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {samplesQuery.data.samples.map((sample: any, idx: number) => (
                    <div key={idx} className="p-2 border border-slate-200 rounded hover:bg-slate-50 transition">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-700">{sample.name}</p>
                          <p className="text-xs text-slate-500">{sample.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUseSample(sample.query)}
                          className="flex-shrink-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
