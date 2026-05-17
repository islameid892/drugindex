import { Link } from "wouter";
import { FileDown, Stethoscope, Download, Upload, Trash2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface UploadedFile {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  s3Url: string;
  uploadedAt: Date | null;
  downloads: number;
  description: string | null;
}

const STATIC_FILES = [
  {
    id: "static-1",
    name: "Category Management Combined Guide",
    description: "Comprehensive guide covering category management strategies and best practices",
    url: "/manus-storage/Category_Management_Combined_Guide_7e0afd63.pdf",
    size: "168 KB",
    isStatic: true,
  },
  {
    id: "static-2",
    name: "Consumer Centric Category Management Summary",
    description: "Summary of consumer-centric approaches to category management",
    url: "/manus-storage/Consumer_Centric_Category_Management_Summary(1)_fa960fd4.pdf",
    size: "477 KB",
    isStatic: true,
  },
  {
    id: "static-3",
    name: "Consumer Centric Category Management FINAL",
    description: "Final version of consumer-centric category management documentation",
    url: "/manus-storage/Consumer_Centric_Category_Management_FINAL_49deee4c.pdf",
    size: "198 KB",
    isStatic: true,
  },
  {
    id: "static-4",
    name: "Consumer Centric Category Management Expanded",
    description: "Expanded English version with detailed explanations and examples",
    url: "/manus-storage/Consumer_Centric_Category_Management_Expanded_English_f894616c.pdf",
    size: "22 KB",
    isStatic: true,
  },
];

export default function Files() {
  const { user, loading } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [error, setError] = useState<string | null>(null);

  // Fetch uploaded files
  const { data: filesData, isLoading: isLoadingFiles } = trpc.files.getAll.useQuery();
  const uploadMutation = trpc.files.upload.useMutation();
  const deleteMutation = trpc.files.delete.useMutation();
  const incrementDownloadMutation = trpc.files.incrementDownload.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (filesData) {
      setUploadedFiles(filesData as UploadedFile[]);
    }
  }, [filesData]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
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
    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    setError(null);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds 50MB limit`);
        continue;
      }

      // Read file and upload
      const reader = new FileReader();
      const fileId = `upload-${Date.now()}-${i}`;

      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress((prev) => ({ ...prev, [fileId]: progress }));
        }
      };

      reader.onload = async (e) => {
        try {
          const base64String = (e.target?.result as string).split(",")[1] || "";
          const fileType = file.type.split("/")[1] || file.name.split(".").pop() || "bin";

          await uploadMutation.mutateAsync({
            fileName: file.name,
            fileData: base64String,
            fileType: fileType,
            description: `Uploaded by ${user?.name || "user"}`,
          });

          // Refresh files list after successful upload
          // The query will auto-refetch due to React Query's invalidation
          setTimeout(() => {
            utils.files.getAll.invalidate();
          }, 500);
        } catch (err) {
          setError(`Failed to upload "${file.name}"`);
          console.error("Upload error:", err);
        } finally {
          setUploadProgress((prev) => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
          });
        }
      };

      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async (fileId: number) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      await deleteMutation.mutateAsync({ fileId });
      setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      setError("Failed to delete file");
      console.error("Delete error:", err);
    }
  };

  const handleDownload = async (url: string, fileName: string, fileId?: number) => {
    // Track download
    if (fileId) {
      await incrementDownloadMutation.mutateAsync({ fileId });
    }

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allFiles = [
    ...STATIC_FILES.map((f) => ({
      ...f,
      downloads: 0,
      fileId: undefined,
      uploadedAt: null,
    })),
    ...uploadedFiles.map((f) => ({
      id: `uploaded-${f.id}`,
      name: f.fileName,
      description: f.description || "User uploaded file",
      url: f.s3Url,
      size: formatFileSize(f.fileSize),
      fileId: f.id,
      isStatic: false,
      downloads: f.downloads,
      uploadedAt: f.uploadedAt,
    })),
  ];

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-sky-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-sky-100 bg-white/95 backdrop-blur-md">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <a className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="bg-gradient-to-br from-sky-500 to-sky-600 p-2 rounded-lg">
                  <Stethoscope className="h-6 w-6 text-white" />
                </div>
                <span className="font-bold text-lg text-slate-900">ICD-10 Search</span>
              </a>
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/about">
                <a className="text-sm font-medium text-slate-600 hover:text-sky-600">About</a>
              </Link>
              <Link href="/files">
                <a className="text-sm font-medium text-sky-600">Files</a>
              </Link>
              <Link href="/tools">
                <a className="text-sm font-medium text-slate-600 hover:text-sky-600">Tools</a>
              </Link>
              <Link href="/">
                <Button size="sm" variant="outline">Back Home</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-16 space-y-12">
        {/* Hero Section */}
        <section className="space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-100 border border-sky-200">
            <FileDown className="h-4 w-4 text-sky-600" />
            <span className="text-sm font-semibold text-sky-700">Available Resources</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight">
            Download Files
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Access our collection of guides and documentation. {user ? "Upload your own files up to 50MB." : "Sign in to upload files."}
          </p>
        </section>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Upload Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">Upload Files</h2>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                isDragging
                  ? "border-sky-500 bg-sky-50"
                  : "border-slate-300 bg-slate-50 hover:border-sky-400 hover:bg-sky-50/50"
              }`}
            >
              <input
                type="file"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
                id="file-input"
                accept="*/*"
              />
              <label htmlFor="file-input" className="cursor-pointer block">
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-sky-100 rounded-lg p-3 w-fit">
                    <Upload className="h-6 w-6 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">Drag files here or click to browse</p>
                    <p className="text-sm text-slate-600 mt-1">Maximum file size: 50MB</p>
                  </div>
                </div>
              </label>
            </div>

            {/* Upload Progress */}
            {Object.keys(uploadProgress).length > 0 && (
              <div className="space-y-2">
                {Object.entries(uploadProgress).map(([fileId, progress]) => (
                  <div key={fileId} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Uploading...</span>
                      <span className="text-sm text-slate-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-sky-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        {/* Files Grid */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">
            {uploadedFiles.length > 0 ? `All Files (${allFiles.length})` : "Available Files"}
          </h2>
          {isLoadingFiles ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-sky-600 animate-spin" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {allFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow space-y-4"
                >
                  {/* File Icon and Header */}
                  <div className="flex items-start justify-between">
                    <div className="bg-sky-100 rounded-lg p-3 w-fit">
                      <FileDown className="h-6 w-6 text-sky-600" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                        {file.size}
                      </span>
                      {!file.isStatic && (
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-2">
                      {file.name}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {file.description}
                    </p>
                    {file.downloads > 0 && (
                      <p className="text-xs text-slate-500">
                        {file.downloads} download{file.downloads !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDownload(file.url, file.name)}
                      className="flex-1 gap-2 bg-sky-600 hover:bg-sky-700 text-white"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    {!file.isStatic && user && file.fileId && (
                      <Button
                        onClick={() => handleDelete(file.fileId!)}
                        variant="outline"
                        className="gap-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Info Section */}
        <section className="bg-emerald-50 rounded-xl border border-emerald-200 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">About These Files</h2>
          <p className="text-slate-700">
            This page provides access to medical documentation, guides, and resources. {user ? "You can also upload your own files for sharing with other users." : "Sign in to upload your own files."}
          </p>
          <ul className="space-y-2 text-slate-700">
            <li className="flex items-start gap-3">
              <span className="text-emerald-600 font-bold mt-1">✓</span>
              <span>All files are free to download</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-600 font-bold mt-1">✓</span>
              <span>Files are stored securely in cloud storage</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-600 font-bold mt-1">✓</span>
              <span>Maximum upload size: 50MB per file</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-600 font-bold mt-1">✓</span>
              <span>Compatible with all devices and operating systems</span>
            </li>
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-16">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              © 2024 ICD-10 Search Engine. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy">
                <a className="text-sm text-slate-600 hover:text-sky-600">Privacy Policy</a>
              </Link>
              <Link href="/terms">
                <a className="text-sm text-slate-600 hover:text-sky-600">Terms of Service</a>
              </Link>
              <Link href="/contact">
                <a className="text-sm text-slate-600 hover:text-sky-600">Contact</a>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
