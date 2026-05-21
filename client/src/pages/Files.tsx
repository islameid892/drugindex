import { FileDown, Download, Upload, Trash2, Loader2, AlertCircle, Lock, Eye, EyeOff, X, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
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

interface UploadTask {
  file: File;
  progress: number; // 0-100
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  tempId: string;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + " " + sizes[i];
}

export default function Files() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [fileList, setFileList] = useState<UploadedFile[]>([]);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const authenticateMutation = trpc.files.authenticate.useMutation();
  const deleteMutation = trpc.files.delete.useMutation();
  const incrementDownloadMutation = trpc.files.incrementDownload.useMutation();
  const utils = trpc.useUtils();

  // Check existing auth cookie
  useEffect(() => {
    const cookies = document.cookie.split(";");
    const hasAuth = cookies.some((c) => c.trim().startsWith("files_auth="));
    setIsAuthenticated(hasAuth);
  }, []);

  // Fetch files when authenticated
  const { data: filesData, isLoading: isLoadingFiles } = trpc.files.getAll.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (filesData) {
      setFileList(filesData as UploadedFile[]);
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
      utils.files.getAll.invalidate();
    } catch (err: any) {
      setAuthError(err.message || "Invalid password");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Upload a single file via XHR for real progress tracking
  const uploadFileXHR = useCallback((file: File, tempId: string) => {
    return new Promise<UploadedFile>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);

      // Track real upload progress
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploadTasks((prev) =>
            prev.map((t) => (t.tempId === tempId ? { ...t, progress: pct } : t))
          );
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch {
            reject(new Error("Invalid server response"));
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.error || `Upload failed (${xhr.status})`));
          } catch {
            reject(new Error(`Upload failed (${xhr.status})`));
          }
        }
      });

      xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
      xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

      xhr.open("POST", "/api/files/upload");
      xhr.withCredentials = true; // Send cookies for auth
      xhr.send(formData);
    });
  }, []);

  const processFiles = useCallback(
    async (files: File[]) => {
      const validFiles = files.filter((f) => {
        if (f.size > MAX_FILE_SIZE) {
          setGlobalError(`"${f.name}" exceeds 100MB limit`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;
      setGlobalError(null);

      // Create upload tasks
      const tasks: UploadTask[] = validFiles.map((f) => ({
        file: f,
        progress: 0,
        status: "pending",
        tempId: `${Date.now()}-${Math.random()}`,
      }));

      setUploadTasks((prev) => [...prev, ...tasks]);

      // Add optimistic entries to file list
      const optimisticFiles: UploadedFile[] = tasks.map((t) => ({
        id: -parseInt(t.tempId.replace(".", "").slice(0, 10)),
        fileName: t.file.name,
        fileSize: t.file.size,
        fileType: t.file.type,
        s3Url: "",
        uploadedAt: new Date(),
        downloads: 0,
        description: null,
      }));
      setFileList((prev) => [...optimisticFiles, ...prev]);

      // Upload all files concurrently
      await Promise.all(
        tasks.map(async (task) => {
          setUploadTasks((prev) =>
            prev.map((t) => (t.tempId === task.tempId ? { ...t, status: "uploading" } : t))
          );

          try {
            const result = await uploadFileXHR(task.file, task.tempId);

            // Replace optimistic entry with real data
            setFileList((prev) =>
              prev.map((f) =>
                f.fileName === task.file.name && f.s3Url === ""
                  ? { ...result, uploadedAt: result.uploadedAt ? new Date(result.uploadedAt) : new Date() }
                  : f
              )
            );

            setUploadTasks((prev) =>
              prev.map((t) => (t.tempId === task.tempId ? { ...t, status: "done", progress: 100 } : t))
            );

            // Remove task after 2 seconds
            setTimeout(() => {
              setUploadTasks((prev) => prev.filter((t) => t.tempId !== task.tempId));
            }, 2000);
          } catch (err: any) {
            // Remove optimistic entry on error
            setFileList((prev) =>
              prev.filter((f) => !(f.fileName === task.file.name && f.s3Url === ""))
            );

            setUploadTasks((prev) =>
              prev.map((t) =>
                t.tempId === task.tempId
                  ? { ...t, status: "error", error: err.message }
                  : t
              )
            );
          }
        })
      );
    },
    [uploadFileXHR]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
      e.target.value = ""; // Reset input
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleDelete = async (fileId: number, fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return;

    // Instant optimistic delete
    setFileList((prev) => prev.filter((f) => f.id !== fileId));
    setGlobalError(null);

    try {
      await deleteMutation.mutateAsync({ fileId });
    } catch (err: any) {
      // Restore on failure
      utils.files.getAll.invalidate();
      setGlobalError(err.message || `Failed to delete "${fileName}"`);
    }
  };

  const handleDownload = async (file: UploadedFile) => {
    try {
      await incrementDownloadMutation.mutateAsync({ fileId: file.id });
    } catch {}
    window.open(file.s3Url, "_blank");
  };

  // ─── Auth Screen ───────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <div className="p-8 space-y-6">
            <div className="flex justify-center">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-xl">
                <Lock className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-gray-900">Files Access</h1>
              <p className="text-gray-500 text-sm">Enter password to access files</p>
            </div>
            <form onSubmit={handleAuthenticate} className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setAuthError(null); }}
                  disabled={isAuthLoading}
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {authError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600">{authError}</p>
                </div>
              )}
              <Button
                type="submit"
                disabled={!password || isAuthLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                {isAuthLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying...</> : "Access Files"}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Main Files UI ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl">
            <FileDown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Files Management</h1>
            <p className="text-gray-500 text-sm">{fileList.filter(f => f.s3Url).length} files stored</p>
          </div>
        </div>

        {/* Global Error */}
        {globalError && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600 flex-1">{globalError}</p>
            <button onClick={() => setGlobalError(null)}>
              <X className="h-4 w-4 text-red-400 hover:text-red-600" />
            </button>
          </div>
        )}

        {/* Upload Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? "border-blue-500 bg-blue-50 scale-[1.01]"
              : "border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="*/*"
            className="hidden"
            onChange={handleFileInputChange}
          />
          <Upload className={`h-10 w-10 mx-auto mb-3 ${isDragging ? "text-blue-500" : "text-slate-400"}`} />
          <p className="text-base font-semibold text-slate-700">
            {isDragging ? "Drop files here" : "Click or drag files to upload"}
          </p>
          <p className="text-sm text-slate-400 mt-1">All file types supported · Up to 100MB per file · Multiple files at once</p>
        </div>

        {/* Active Upload Tasks */}
        {uploadTasks.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Uploading</h2>
            {uploadTasks.map((task) => (
              <div key={task.tempId} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <FileIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-700 flex-1 truncate">{task.file.name}</span>
                  <span className="text-xs text-slate-400">{formatFileSize(task.file.size)}</span>
                  {task.status === "uploading" && (
                    <span className="text-xs font-bold text-blue-600 min-w-[36px] text-right">{task.progress}%</span>
                  )}
                  {task.status === "done" && (
                    <span className="text-xs font-bold text-green-600">Done ✓</span>
                  )}
                  {task.status === "error" && (
                    <span className="text-xs font-bold text-red-500">Failed</span>
                  )}
                </div>

                {/* Progress bar */}
                {(task.status === "uploading" || task.status === "pending") && (
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                )}
                {task.status === "done" && (
                  <div className="w-full bg-green-100 rounded-full h-2">
                    <div className="h-2 bg-green-500 rounded-full w-full" />
                  </div>
                )}
                {task.status === "error" && (
                  <p className="text-xs text-red-500 mt-1">{task.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* File List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
            Stored Files ({fileList.filter(f => f.s3Url).length})
          </h2>

          {isLoadingFiles ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : fileList.filter(f => f.s3Url).length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <FileDown className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No files yet</p>
              <p className="text-slate-400 text-sm mt-1">Upload your first file above</p>
            </div>
          ) : (
            fileList
              .filter(f => f.s3Url) // Only show fully uploaded files
              .map((file) => (
                <div
                  key={file.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-blue-200 hover:shadow-sm transition-all"
                >
                  <div className="bg-blue-50 p-2.5 rounded-lg flex-shrink-0">
                    <FileIcon className="h-5 w-5 text-blue-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{file.fileName}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-400">{formatFileSize(file.fileSize)}</span>
                      {file.uploadedAt && (
                        <span className="text-xs text-slate-400">
                          {new Date(file.uploadedAt).toLocaleDateString()}
                        </span>
                      )}
                      {file.downloads > 0 && (
                        <span className="text-xs text-slate-400">{file.downloads} downloads</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file)}
                      className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(file.id, file.fileName)}
                      className="gap-1.5 text-red-500 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
