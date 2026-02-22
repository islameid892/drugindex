import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
}

export default function ImageToPDF() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const convertMutation = trpc.tools.imagesToPDF.useMutation();

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

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

  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    setImages(newImages);
  };

  const handleConvertToPDF = async () => {
    if (images.length === 0) return;

    setIsConverting(true);
    try {
      // Convert images to base64
      const imageDataList = await Promise.all(
        images.map(
          (img) =>
            new Promise<{ data: string; type: string }>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                const base64 = e.target?.result as string;
                resolve({
                  data: base64,
                  type: img.file.type,
                });
              };
              reader.readAsDataURL(img.file);
            })
        )
      );

      // Call the conversion endpoint
      const result = await convertMutation.mutateAsync({
        images: imageDataList,
      });

      // Download the PDF
      const link = document.createElement('a');
      link.href = result.url;
      link.download = 'converted.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clear images after successful conversion
      setImages([]);
    } catch (error) {
      console.error('Error converting to PDF:', error);
      alert('خطأ في تحويل الصور إلى PDF');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            تحويل الصور إلى PDF
          </h1>
          <p className="text-lg text-slate-600">
            أداة بسيطة وسريعة لتحويل صورك إلى ملف PDF واحد
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 bg-slate-50 hover:border-slate-400'
            }`}
          >
            <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              اسحب الصور هنا أو انقر للاختيار
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              يدعم صيغ: JPG, PNG, WebP, GIF
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              اختر الصور
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

          {/* Images Preview */}
          {images.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                الصور المختارة ({images.length})
              </h3>
              <div className="space-y-3">
                {images.map((img, index) => (
                  <div
                    key={img.id}
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    {/* Drag Handle */}
                    <GripVertical className="h-5 w-5 text-slate-400 cursor-grab active:cursor-grabbing" />

                    {/* Image Preview */}
                    <img
                      src={img.preview}
                      alt={`Preview ${index + 1}`}
                      className="h-16 w-16 object-cover rounded border border-slate-200"
                    />

                    {/* Image Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {img.file.name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {(img.file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>

                    {/* Order Controls */}
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          index > 0 && handleMoveImage(index, index - 1)
                        }
                        disabled={index === 0}
                        className="text-slate-600"
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          index < images.length - 1 &&
                          handleMoveImage(index, index + 1)
                        }
                        disabled={index === images.length - 1}
                        className="text-slate-600"
                      >
                        ↓
                      </Button>
                    </div>

                    {/* Remove Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveImage(img.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-8">
                <Button
                  onClick={handleConvertToPDF}
                  disabled={images.length === 0 || isConverting}
                  className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  {isConverting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري التحويل...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      تحويل إلى PDF وتحميل
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setImages([])}
                  variant="outline"
                  disabled={images.length === 0}
                >
                  مسح الكل
                </Button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {images.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">لم تختر أي صور بعد</p>
            </div>
          )}

          {/* Info */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              💡 <strong>نصيحة:</strong> يمكنك سحب الصور لتغيير ترتيبها قبل
              التحويل. استخدم الأزرار ↑↓ لتغيير الترتيب بسهولة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
