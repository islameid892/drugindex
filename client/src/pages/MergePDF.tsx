import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download, Trash2, ArrowUp, ArrowDown, Loader2, Layers, CheckCircle, Plus, RotateCcw } from 'lucide-react';
import { Link } from 'wouter';
import { PDFDocument } from 'pdf-lib';

interface UploadedPDF {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number | null;
}

export default function MergePDF() {
  const [pdfs, setPdfs] = useState<UploadedPDF[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);
  const [mergedPageCount, setMergedPageCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getPageCount = async (file: File): Promise<number> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      return pdf.getPageCount();
    } catch {
      return 0;
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;
    setError(null);

    const newPdfs: UploadedPDF[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const pageCount = await getPageCount(file);
        newPdfs.push({
          id: `${Date.now()}-${i}`,
          file,
          name: file.name,
          size: file.size,
          pageCount,
        });
      } else {
        setError(`"${file.name}" is not a PDF file. Only PDF files are accepted.`);
      }
    }
    setPdfs((prev) => [...prev, ...newPdfs]);
    if (mergedBlob) {
      setMergedBlob(null);
      if (mergedUrl) URL.revokeObjectURL(mergedUrl);
      setMergedUrl(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleRemovePDF = (id: string) => {
    setPdfs((prev) => prev.filter((p) => p.id !== id));
    if (mergedBlob) {
      setMergedBlob(null);
      if (mergedUrl) URL.revokeObjectURL(mergedUrl);
      setMergedUrl(null);
    }
  };

  const handleMovePDF = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= pdfs.length) return;

    const newPdfs = [...pdfs];
    [newPdfs[fromIndex], newPdfs[toIndex]] = [newPdfs[toIndex], newPdfs[fromIndex]];
    setPdfs(newPdfs);
    if (mergedBlob) {
      setMergedBlob(null);
      if (mergedUrl) URL.revokeObjectURL(mergedUrl);
      setMergedUrl(null);
    }
  };

  const handleMergePDFs = useCallback(async () => {
    if (pdfs.length < 2) {
      setError('Please add at least 2 PDF files to merge.');
      return;
    }

    setIsMerging(true);
    setError(null);
    setProgress(0);
    setMergedBlob(null);
    if (mergedUrl) URL.revokeObjectURL(mergedUrl);
    setMergedUrl(null);

    try {
      const mergedPdf = await PDFDocument.create();
      const total = pdfs.length;

      for (let i = 0; i < total; i++) {
        setProgress(Math.round((i / total) * 90));

        try {
          const arrayBuffer = await pdfs[i].file.arrayBuffer();
          const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } catch (pdfError) {
          console.error(`Error processing ${pdfs[i].name}:`, pdfError);
          setError(`Failed to process "${pdfs[i].name}". It may be corrupted or password-protected.`);
        }
      }

      setProgress(95);

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setMergedBlob(blob);
      setMergedUrl(url);
      setMergedPageCount(mergedPdf.getPageCount());
      setProgress(100);

      // Auto-download
      const link = document.createElement('a');
      link.href = url;
      link.download = `merged_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error merging PDFs:', err);
      setError('Failed to merge PDF files. Please try again.');
    } finally {
      setIsMerging(false);
    }
  }, [pdfs, mergedUrl]);

  const handleDownloadAgain = () => {
    if (!mergedUrl) return;
    const link = document.createElement('a');
    link.href = mergedUrl;
    link.download = `merged_${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStartOver = () => {
    setPdfs([]);
    setMergedBlob(null);
    if (mergedUrl) URL.revokeObjectURL(mergedUrl);
    setMergedUrl(null);
    setProgress(0);
    setError(null);
    setMergedPageCount(0);
  };

  const totalPages = pdfs.reduce((sum, p) => sum + (p.pageCount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="container py-6">
          <Link href="/tools">
            <a className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors mb-4">
              <span>←</span>
              <span>Back to Tools</span>
            </a>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Layers className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Merge PDF Files</h1>
              <p className="text-slate-400 mt-1">Combine multiple PDF files into one document — fast & offline</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12">
        <div className="max-w-3xl mx-auto">

          {/* Success State */}
          {mergedBlob && !isMerging && (
            <div className="mb-8 p-8 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-emerald-300">PDFs Merged Successfully!</h3>
                  <p className="text-slate-400 mt-2">
                    {pdfs.length} files merged • {mergedPageCount} total pages • {(mergedBlob.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <Button
                    onClick={handleDownloadAgain}
                    className="gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-8 py-5 text-lg font-semibold"
                  >
                    <Download className="h-5 w-5" />
                    Download PDF Again
                  </Button>
                  <Button
                    onClick={handleStartOver}
                    variant="outline"
                    className="gap-2 border-slate-600 text-slate-300 hover:bg-slate-800 px-6 py-5"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Start Over
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Upload Area */}
          {!mergedBlob && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                isDragging
                  ? 'border-purple-400 bg-purple-500/10'
                  : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
              }`}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                  <Layers className="h-8 w-8 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Drag and drop your PDF files here
                  </h3>
                  <p className="text-slate-400 mb-4">
                    or click the button below to select files
                  </p>
                  <p className="text-sm text-slate-500">
                    Only PDF files are accepted
                  </p>
                </div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  <Upload className="h-4 w-4" />
                  Select PDF Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    handleFileSelect(e.target.files);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Progress Bar */}
          {isMerging && (
            <div className="mt-6 p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-medium">Merging PDF files...</span>
                <span className="text-purple-400 font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-slate-400 text-sm mt-2">Processing locally in your browser — no upload needed</p>
            </div>
          )}

          {/* PDF List */}
          {pdfs.length > 0 && !mergedBlob && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    Selected Files ({pdfs.length})
                  </h3>
                  {totalPages > 0 && (
                    <p className="text-sm text-slate-400 mt-1">{totalPages} total pages</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    size="sm"
                    className="text-purple-400 border-purple-500/30 hover:bg-purple-500/10 gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add More
                  </Button>
                  <Button
                    onClick={() => {
                      setPdfs([]);
                      setError(null);
                    }}
                    variant="outline"
                    size="sm"
                    className="text-slate-400 border-slate-600 hover:bg-slate-800"
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                {pdfs.map((pdf, index) => (
                  <div
                    key={pdf.id}
                    className="flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors"
                  >
                    <div className="text-slate-500 font-mono text-sm w-6 text-center">{index + 1}</div>
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-red-400 font-bold text-xs">PDF</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{pdf.name}</p>
                      <p className="text-sm text-slate-400">
                        {pdf.size >= 1024 * 1024
                          ? `${(pdf.size / (1024 * 1024)).toFixed(1)} MB`
                          : `${(pdf.size / 1024).toFixed(0)} KB`}
                        {pdf.pageCount ? ` • ${pdf.pageCount} pages` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMovePDF(index, 'up')}
                        disabled={index === 0}
                        className="text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 h-8 w-8 p-0"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMovePDF(index, 'down')}
                        disabled={index === pdfs.length - 1}
                        className="text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 h-8 w-8 p-0"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemovePDF(pdf.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleMergePDFs}
                disabled={pdfs.length < 2 || isMerging}
                className="w-full gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg font-semibold disabled:opacity-50"
              >
                {isMerging ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Merging... {progress}%
                  </>
                ) : (
                  <>
                    <Layers className="h-5 w-5" />
                    Merge {pdfs.length} PDFs & Download
                  </>
                )}
              </Button>

              {pdfs.length === 1 && (
                <p className="text-center text-amber-400 text-sm mt-3">Add at least one more PDF file to merge</p>
              )}
            </div>
          )}

          {/* Info Box */}
          {pdfs.length === 0 && !mergedBlob && (
            <div className="mt-8 p-6 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <p className="text-purple-300">
                <strong>💡 Tip:</strong> Reorder your PDF files using the up/down arrows. The final merged PDF will follow this order. All processing happens in your browser — private and fast.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
