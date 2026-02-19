import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Download, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface BulkResult {
  input: string;
  type: 'medication' | 'code' | 'unknown';
  found: boolean;
  isCovered: boolean;
  details: {
    name?: string;
    scientificName?: string;
    indication?: string;
    codes?: string[];
  };
}

export function BulkVerification() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<BulkResult[]>([]);
  
  const verifyMutation = trpc.bulk.verifyBatch.useMutation({
    onSuccess: (data) => {
      setResults(Array.isArray(data) ? data : []);
    },
    onError: (error) => {
      console.error('Verification failed:', error);
    },
  });

  const handleVerify = useCallback(async () => {
    if (!input.trim()) return;

    const items = input
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    verifyMutation.mutate({ items });
  }, [input, verifyMutation]);

  const handleExportCSV = useCallback(() => {
    if (results.length === 0) return;

    const headers = ['Input', 'Type', 'Found', 'Coverage Status', 'Name', 'Details'];
    const rows = results.map(r => [
      r.input,
      r.type,
      r.found ? 'Yes' : 'No',
      r.found ? (r.isCovered ? 'Covered' : 'Not Covered') : 'N/A',
      r.details.name || '',
      r.details.scientificName || r.details.indication || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk-verification-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [results]);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Bulk Code Verification</h2>
        <p className="text-sm text-slate-600 mb-4">
          Paste multiple medication names or ICD-10 codes (one per line) to check their coverage status in batch.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Enter Medications or Codes</label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Example:&#10;Metformin&#10;D07.28&#10;Panadol&#10;E11.9"
              className="w-full h-32 p-3 border border-slate-300 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleVerify}
              disabled={!input.trim() || verifyMutation.isPending}
              className="flex items-center gap-2"
            >
              {verifyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Verify Batch
                </>
              )}
            </Button>

            {results.length > 0 && (
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
        </div>
      </Card>

      {results.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Verification Results ({results.length})</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-semibold">Input</th>
                  <th className="text-left py-2 px-3 font-semibold">Type</th>
                  <th className="text-left py-2 px-3 font-semibold">Status</th>
                  <th className="text-left py-2 px-3 font-semibold">Coverage</th>
                  <th className="text-left py-2 px-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono text-xs">{result.input}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        result.type === 'code' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {result.type}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {result.found ? (
                        <div className="flex items-center gap-1 text-green-700">
                          <CheckCircle2 className="h-4 w-4" />
                          Found
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-700">
                          <XCircle className="h-4 w-4" />
                          Not Found
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {result.found && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          result.isCovered 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {result.isCovered ? 'Covered' : 'Not Covered'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-xs">
                      {result.details.name && (
                        <div>
                          <div className="font-semibold">{result.details.name}</div>
                          {result.details.scientificName && (
                            <div className="text-slate-600">{result.details.scientificName}</div>
                          )}
                          {result.details.indication && (
                            <div className="text-slate-500 italic">{result.details.indication}</div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-lg flex gap-4 text-sm">
            <div>
              <span className="font-semibold">Total:</span> {results.length}
            </div>
            <div>
              <span className="font-semibold">Found:</span> {results.filter(r => r.found).length}
            </div>
            <div>
              <span className="font-semibold">Covered:</span> {results.filter(r => r.found && r.isCovered).length}
            </div>
            <div>
              <span className="font-semibold">Not Covered:</span> {results.filter(r => r.found && !r.isCovered).length}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
