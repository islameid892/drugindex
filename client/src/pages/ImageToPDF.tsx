import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download, Trash2, ArrowUp, ArrowDown, Loader2, FileText, CheckCircle, Plus, RotateCcw } from 'lucide-react';
import { Link } from 'wouter';
import { PDFDocument } from 'pdf-lib';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
}

export default function ImageToPDF() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [convertedCount, setConvertedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    setError(null);

    const newImages: UploadedImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        newImages.push({
          id: `${Date.now()}-${i}`,
          file,
          preview,
        });
      }
    }
    setImages((prev) => [...prev, ...newImages]);
    // Reset PDF state when new images are added
    if (pdfBlob) {
      setPdfBlob(null);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
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

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    if (pdfBlob) {
      setPdfBlob(null);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  const handleMoveImage = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= images.length) return;

    const newImages = [...images];
    [newImages[fromIndex], newImages[toIndex]] = [newImages[toIndex], newImages[fromIndex]];
    setImages(newImages);
    if (pdfBlob) {
      setPdfBlob(null);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleConvertToPDF = useCallback(async () => {
    if (images.length === 0) return;

    setIsConverting(true);
    setError(null);
    setProgress(0);
    setPdfBlob(null);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);

    try {
      const pdfDoc = await PDFDocument.create();
      const total = images.length;

      for (let i = 0; i < total; i++) {
        const img = images[i];
        setProgress(Math.round(((i) / total) * 100));

        try {
          const arrayBuffer = await readFileAsArrayBuffer(img.file);
          const uint8 = new Uint8Array(arrayBuffer) as any;

          let embeddedImage;
          const type = img.file.type.toLowerCase();

          if (type === 'image/jpeg' || type === 'image/jpg') {
            embeddedImage = await pdfDoc.embedJpg(uint8);
          } else if (type === 'image/png') {
            embeddedImage = await pdfDoc.embedPng(uint8);
          } else {
            // For WebP, GIF, etc. - convert to canvas then to PNG
            const bitmap = await createImageBitmap(img.file);
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(bitmap, 0, 0);
            const pngBlob = await new Promise<Blob>((resolve, reject) => {
              canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas to blob failed'));
              }, 'image/png');
            });
            const pngBuffer = new Uint8Array(await pngBlob.arrayBuffer()) as any;
            embeddedImage = await pdfDoc.embedPng(pngBuffer);
            bitmap.close();
          }

          const { width, height } = embeddedImage.scale(1);
          const page = pdfDoc.addPage([width, height]);
          page.drawImage(embeddedImage, { x: 0, y: 0, width, height });
        } catch (imgError) {
          console.error(`Error processing image ${img.file.name}:`, imgError);
          // Continue with next image
        }
      }

      setProgress(90);

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setPdfBlob(blob);
      setPdfUrl(url);
      setConvertedCount(images.length);
      setProgress(100);

      // Auto-download
      const link = document.createElement('a');
      link.href = url;
      link.download = `converted_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error converting to PDF:', err);
      setError('Failed to convert images to PDF. Please try again with different images.');
    } finally {
      setIsConverting(false);
    }
  }, [images, pdfUrl]);

  const handleDownloadAgain = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `converted_${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStartOver = () => {
    setImages([]);
    setPdfBlob(null);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setProgress(0);
    setError(null);
    setConvertedCount(0);
  };

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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Image to PDF Converter</h1>
              <p className="text-slate-400 mt-1">Convert your images to a professional PDF document — fast & offline</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12">
        <div className="max-w-3xl mx-auto">

          {/* Success State */}
          {pdfBlob && !isConverting && (
            <div className="mb-8 p-8 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-emerald-300">PDF Created Successfully!</h3>
                  <p className="text-slate-400 mt-2">
                    {convertedCount} image{convertedCount > 1 ? 's' : ''} converted • {(pdfBlob.size / 1024).toFixed(0)} KB
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

          {/* Upload Area - show when no PDF or when adding more */}
          {!pdfBlob && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                isDragging
                  ? 'border-blue-400 bg-blue-500/10'
                  : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
              }`}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Drag and drop your images here
                  </h3>
                  <p className="text-slate-400 mb-4">
                    or click the button below to select files
                  </p>
                  <p className="text-sm text-slate-500">
                    Supported formats: JPG, PNG, WebP, GIF
                  </p>
                </div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                >
                  <Upload className="h-4 w-4" />
                  Select Images
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
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
          {isConverting && (
            <div className="mt-6 p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-medium">Converting images...</span>
                <span className="text-blue-400 font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-slate-400 text-sm mt-2">Processing locally in your browser — no upload needed</p>
            </div>
          )}

          {/* Images Preview */}
          {images.length > 0 && !pdfBlob && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  Selected Images ({images.length})
                </h3>
                <div className="flex gap-2">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    size="sm"
                    className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10 gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add More
                  </Button>
                  <Button
                    onClick={() => {
                      setImages([]);
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
                {images.map((img, index) => (
                  <div
                    key={img.id}
                    className="flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors"
                  >
                    <div className="text-slate-500 font-mono text-sm w-6 text-center">{index + 1}</div>
                    <img
                      src={img.preview}
                      alt={`Preview ${index + 1}`}
                      className="h-16 w-16 object-cover rounded border border-slate-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{img.file.name}</p>
                      <p className="text-sm text-slate-400">
                        {img.file.size >= 1024 * 1024
                          ? `${(img.file.size / (1024 * 1024)).toFixed(1)} MB`
                          : `${(img.file.size / 1024).toFixed(0)} KB`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMoveImage(index, 'up')}
                        disabled={index === 0}
                        className="text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 h-8 w-8 p-0"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMoveImage(index, 'down')}
                        disabled={index === images.length - 1}
                        className="text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 h-8 w-8 p-0"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveImage(img.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleConvertToPDF}
                disabled={images.length === 0 || isConverting}
                className="w-full gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-6 text-lg font-semibold"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Converting... {progress}%
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Convert to PDF & Download
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Info Box */}
          {images.length === 0 && !pdfBlob && (
            <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300">
                <strong>💡 Tip:</strong> All processing happens in your browser — your images are never uploaded to any server. Fast, private, and works offline.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
