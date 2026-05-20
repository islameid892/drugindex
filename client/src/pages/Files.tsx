import { FileDown, Stethoscope, Download, Upload, Trash2, Loader2, AlertCircle, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

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

export default function Files() {
  const { user } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [error, setError] = useState<string | null>(null);

  // Check if user has files_auth cookie
  useEffect(() => {
    const cookies = document.cookie.split(';');
    const hasAuth = cookies.some(cookie => cookie.trim().startsWith('files_auth='));
    setIsAuthenticated(hasAuth);
  }, []);

  // Fetch uploaded files
  const { data: filesData, isLoading: isLoadingFiles } = trpc.files.getAll.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const uploadMutation = trpc.files.upload.useMutation();
  const deleteMutation = trpc.files.delete.useMutation();
  const incrementDownloadMutation = trpc.files.incrementDownload.useMutation();
  const authenticateMutation = trpc.files.authenticate.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (filesData) {
      setUploadedFiles(filesData as UploadedFile[]);
    }
  }, [filesData]);

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);

    try {
      await authenticateMutation.mutateAsync({ password });
      setPassword("");
      setIsAuthenticated(true);
      // Refetch files after authentication
      utils.files.getAll.invalidate();
    } catch (err: any) {
      setAuthError(err.message || "Invalid password");
    } finally {
      setIsAuthLoading(false);
    }
  };

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
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      setError("File size exceeds 50MB limit");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const fileData = e.target?.result as string;
      const base64Data = fileData.split(",")[1];

      setUploadProgress({ [file.name]: 0 });

      try {
        const result = await uploadMutation.mutateAsync({
          fileName: file.name,
          fileData: base64Data,
          fileType: file.type,
          description: "",
        });

        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });

        // Refetch files
        utils.files.getAll.invalidate();
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to upload file");
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (fileId: number, fileName: string) => {
    if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
      try {
        await deleteMutation.mutateAsync({ fileId });
        utils.files.getAll.invalidate();
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to delete file");
      }
    }
  };

  const handleDownload = async (file: UploadedFile) => {
    try {
      await incrementDownloadMutation.mutateAsync({ fileId: file.id });
      window.open(file.s3Url, "_blank");
    } catch (err) {
      console.error("Failed to track download:", err);
      window.open(file.s3Url, "_blank");
    }
  };

  // Authentication UI
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <div className="p-8 space-y-6">
            <div className="flex justify-center">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-lg">
                <Lock className="h-8 w-8 text-white" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-gray-900">Files Access</h1>
              <p className="text-gray-600">Enter password to access files</p>
            </div>

            <form onSubmit={handleAuthenticate} className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setAuthError(null);
                  }}
                  disabled={isAuthLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {authError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-600">{authError}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={!password || isAuthLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                {isAuthLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Access Files"
                )}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    );
  }

  // Main Files UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-lg">
              <FileDown className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Files Management</h1>
              <p className="text-gray-600">Upload and manage your files</p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-700 font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 bg-white hover:border-gray-400"
          }`}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Files</h3>
          <p className="text-gray-600 mb-4">Drag and drop files here or click to browse</p>
          <input
            type="file"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input">
            <Button asChild variant="outline">
              <span>Choose File</span>
            </Button>
          </label>
          <p className="text-xs text-gray-500 mt-4">Maximum file size: 50MB</p>
        </div>

        {/* Upload Progress */}
        {Object.entries(uploadProgress).map(([fileName, progress]) => (
          <div key={fileName} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">{fileName}</span>
              <span className="text-sm text-gray-500">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        ))}

        {/* Files List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">
            Files ({uploadedFiles.length})
          </h2>

          {isLoadingFiles ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : uploadedFiles.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <FileDown className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No files uploaded yet</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 break-words">
                        {file.fileName}
                      </h3>
                      <div className="flex gap-4 mt-2 text-sm text-gray-600">
                        <span>{formatFileSize(file.fileSize)}</span>
                        <span>
                          {file.uploadedAt
                            ? new Date(file.uploadedAt).toLocaleDateString()
                            : "Unknown date"}
                        </span>
                        <span>{file.downloads} downloads</span>
                      </div>
                      {file.description && (
                        <p className="text-sm text-gray-600 mt-2">{file.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(file.id, file.fileName)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
