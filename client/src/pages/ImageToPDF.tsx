import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download, Trash2, ArrowUp, ArrowDown, Loader2, FileText } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Link } from 'wouter';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
}

export default function ImageToPDF() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const convertMutation = trpc.tools.imagesToPDF.useMutation();

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
    setImages([...images, ...newImages]);
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
    setImages(images.filter((img) => img.id !== id));
  };

  const handleMoveImage = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= images.length) return;

    const newImages = [...images];
    [newImages[fromIndex], newImages[toIndex]] = [newImages[toIndex], newImages[fromIndex]];
    setImages(newImages);
  };

  const handleConvertToPDF = async () => {
    if (images.length === 0) return;

    setIsConverting(true);
    setError(null);
    try {
      const imageDataList = await Promise.all(
        images.map(
          (img) =>
            new Promise<{ data: string; type: string }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                const base64 = e.target?.result as string;
                resolve({
                  data: base64,
                  type: img.file.type,
                });
              };
              reader.onerror = () => reject(new Error('Failed to read file'));
              reader.readAsDataURL(img.file);
            })
        )
      );

      const result = await convertMutation.mutateAsync({
        images: imageDataList,
      });

      const link = document.createElement('a');
      link.href = result.url;
      link.download = 'converted.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setImages([]);
    } catch (err) {
      console.error('Error converting to PDF:', err);
      setError('Failed to convert images to PDF. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="container py-6">
          <Link href="/">
            <a className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors mb-4">
              <span>←</span>
              <span>Back to Home</span>
            </a>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Image to PDF Converter</h1>
              <p className="text-slate-400 mt-1">Convert your images to a professional PDF document</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12">
        <div className="max-w-3xl mx-auto">
          {/* Upload Area */}
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
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Images Preview */}
          {images.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  Selected Images ({images.length})
                </h3>
                <Button
                  onClick={() => setImages([])}
                  variant="outline"
                  className="text-slate-400 border-slate-600 hover:bg-slate-800"
                >
                  Clear All
                </Button>
              </div>

              <div className="space-y-3 mb-8">
                {images.map((img, index) => (
                  <div
                    key={img.id}
                    className="flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors group"
                  >
                    {/* Image Preview */}
                    <img
                      src={img.preview}
                      alt={`Preview ${index + 1}`}
                      className="h-16 w-16 object-cover rounded border border-slate-600"
                    />

                    {/* Image Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {img.file.name}
                      </p>
                      <p className="text-sm text-slate-400">
                        {(img.file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>

                    {/* Order Controls */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMoveImage(index, 'up')}
                        disabled={index === 0}
                        className="text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMoveImage(index, 'down')}
                        disabled={index === images.length - 1}
                        className="text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Remove Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveImage(img.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Convert Button */}
              <Button
                onClick={handleConvertToPDF}
                disabled={images.length === 0 || isConverting}
                className="w-full gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-6 text-lg font-semibold"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Converting...
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
          {images.length === 0 && (
            <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300">
                <strong>💡 Tip:</strong> You can reorder your images using the up/down arrows before converting. The order will be preserved in your PDF.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
