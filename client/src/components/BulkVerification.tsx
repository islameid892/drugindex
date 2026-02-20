import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Download, Loader2, CheckCircle2, XCircle, Plus, Camera, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';

interface BulkResult {
  input: string;
  type: 'code';
  found: boolean;
  isCovered: boolean;
  details: {
    name?: string;
  };
}

export function BulkVerification() {
  const [input, setInput] = useState('');
  const [codeSearch, setCodeSearch] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const verifyMutation = trpc.bulk.verifyBatch.useMutation({
    onSuccess: (data) => {
      setResults(Array.isArray(data) ? data : []);
    },
    onError: (error) => {
      console.error('Verification failed:', error);
    },
  });

  const ocrMutation = trpc.ocr.extractCodes.useMutation({
    onSuccess: (data) => {
      const extractedCodes = data.codes || [];
      const newCodes = extractedCodes.filter(
        (code: string) => !codes.includes(code)
      );
      
      if (newCodes.length > 0) {
        setCodes([...codes, ...newCodes]);
      }
      setIsProcessingImage(false);
    },
    onError: (error) => {
      console.error('OCR processing failed:', error);
      setIsProcessingImage(false);
    },
  });

  const handleAddCode = useCallback(() => {
    const trimmedCode = codeSearch.trim().toUpperCase();
    if (trimmedCode && /^[A-Z]\d{2}(\.\d{1,2})?$/.test(trimmedCode)) {
      if (!codes.includes(trimmedCode)) {
        setCodes([...codes, trimmedCode]);
        setCodeSearch('');
      }
    }
  }, [codeSearch, codes]);

  const handleRemoveCode = useCallback((index: number) => {
    setCodes(codes.filter((_, i) => i !== index));
  }, [codes]);

  const handleVerify = useCallback(async () => {
    const allCodes = [
      ...codes,
      ...input
        .split('\n')
        .map(line => line.trim().toUpperCase())
        .filter(line => line.length > 0)
    ];

    if (allCodes.length === 0) return;

    verifyMutation.mutate({ items: allCodes });
  }, [input, codes, verifyMutation]);

  const handleCameraCapture = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Image = event.target?.result as string;
      ocrMutation.mutate({ image: base64Image });
    };
    reader.onerror = () => {
      console.error('Failed to read image file');
      setIsProcessingImage(false);
    };
    reader.readAsDataURL(file);
  }, [codes, ocrMutation]);

  const handleExportCSV = useCallback(() => {
    if (results.length === 0) return;

    const headers = ['Code', 'Found', 'Coverage Status', 'Code Name'];
    const rows = results.map(r => [
      r.input,
      r.found ? 'Yes' : 'No',
      r.found ? (r.isCovered ? 'Covered' : 'Not Covered') : 'N/A',
      r.details.name || ''
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
        <p className="text-sm text-slate-600 mb-6">
          Add ICD-10 codes individually or paste multiple codes to check their coverage status in batch.
        </p>

        <div className="space-y-4">
          {/* Code Search and Add Section */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold">Search and Add ICD-10 Code</label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={codeSearch}
                onChange={(e) => setCodeSearch(e.target.value.toUpperCase())}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCode();
                  }
                }}
                placeholder="e.g., D07.28"
                className="flex-1"
              />
              <Button
                onClick={handleAddCode}
                disabled={!codeSearch.trim()}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
              <Button
                onClick={handleCameraCapture}
                disabled={isProcessingImage}
                variant="outline"
                className="flex items-center gap-2"
                title="Capture codes from image using camera"
              >
                {isProcessingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    Camera
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Added Codes Display */}
          {codes.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold">Added Codes ({codes.length})</label>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                {codes.map((code, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                  >
                    <span>{code}</span>
                    <button
                      onClick={() => handleRemoveCode(idx)}
                      className="hover:text-blue-900 transition-colors"
                      title="Remove code"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual Input Section */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold">Or Paste Multiple Codes (Optional)</label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Example:&#10;D07.28&#10;E11.9&#10;A01.00&#10;B02.9"
              className="w-full h-24 p-3 border border-slate-300 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleVerify}
              disabled={(codes.length === 0 && !input.trim()) || verifyMutation.isPending}
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

      {/* Results Section */}
      {results.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Verification Results ({results.length})</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-semibold">Code</th>
                  <th className="text-left py-2 px-3 font-semibold">Status</th>
                  <th className="text-left py-2 px-3 font-semibold">Coverage</th>
                  <th className="text-left py-2 px-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-semibold text-blue-700">{result.input}</td>
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
                    <td className="py-3 px-3 text-sm">
                      {result.details.name && (
                        <div className="font-medium text-slate-700">{result.details.name}</div>
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
