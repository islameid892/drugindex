import {
  FileDown, Download, Upload, Trash2, Loader2, AlertCircle,
  Lock, Eye, EyeOff, X, FileIcon, LayoutGrid, List,
  Copy, Check, Filter, FileText, FileSpreadsheet, File,
  Search, SortAsc, SortDesc
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StoredFile {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  s3Url: string;
  uploadedAt: string | null;
  downloads: number;
  description: string | null;
  isDeleted: boolean;
}

interface UploadTask {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  tempId: string;
}

type ViewMode = "list" | "grid";
type SortOrder = "newest" | "oldest" | "name" | "size";
type FileFilter = "all" | "excel" | "pdf" | "word" | "other";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + " " + sizes[i];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });
}

function getFileCategory(fileType: string, fileName: string): FileFilter {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const type = fileType.toLowerCase();
  if (type.includes("excel") || type.includes("spreadsheet") || ext === "xlsx" || ext === "xls" || ext === "csv") return "excel";
  if (type.includes("pdf") || ext === "pdf") return "pdf";
  if (type.includes("word") || type.includes("document") || ext === "docx" || ext === "doc") return "word";
  return "other";
}

function getFileIcon(fileType: string, fileName: string) {
  const cat = getFileCategory(fileType, fileName);
  if (cat === "excel") return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
  if (cat === "pdf") return <FileText className="h-5 w-5 text-red-500" />;
  if (cat === "word") return <FileText className="h-5 w-5 text-blue-500" />;
  return <File className="h-5 w-5 text-slate-400" />;
}

function getFileBadgeColor(cat: FileFilter) {
  if (cat === "excel") return "bg-emerald-100 text-emerald-700";
  if (cat === "pdf") return "bg-red-100 text-red-700";
  if (cat === "word") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-600";
}

// ─── API helpers (pure REST — no tRPC) ───────────────────────────────────────
async function apiFetchFiles(): Promise<StoredFile[]> {
  const res = await fetch("/api/files/list", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch files");
  return res.json();
}

async function apiDeleteFile(id: number): Promise<void> {
  const res = await fetch(`/api/files/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Delete failed");
  }
}

async function apiIncrementDownload(id: number): Promise<void> {
  await fetch(`/api/files/${id}/download`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {});
}

// ─── Copy hook ────────────────────────────────────────────────────────────────
function useCopyLink() {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const copy = useCallback((id: number, url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);
  return { copiedId, copy };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Files() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // File state — single source of truth
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Upload tasks
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation dialog
  const [deleteTarget, setDeleteTarget] = useState<StoredFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // View / filter / sort / search
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filter, setFilter] = useState<FileFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [globalError, setGlobalError] = useState<string | null>(null);

  const { copiedId, copy } = useCopyLink();

  // ── Auth check on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const cookies = document.cookie.split(";");
    const hasAuth = cookies.some((c) => c.trim().startsWith("files_auth="));
    setIsAuthenticated(hasAuth);
  }, []);

  // ── Load files after auth ────────────────────────────────────────────────
  const loadFiles = useCallback(async () => {
    setIsLoadingFiles(true);
    setLoadError(null);
    try {
      const data = await apiFetchFiles();
      setFiles(data);
    } catch (e: any) {
      setLoadError(e.message);
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadFiles();
  }, [isAuthenticated, loadFiles]);

  // ── Authenticate ─────────────────────────────────────────────────────────
  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      const res = await fetch("/api/trpc/files.authenticate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { password } }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.json?.message || "Invalid password");
      setPassword("");
      setIsAuthenticated(true);
    } catch (err: any) {
      setAuthError(err.message || "Invalid password");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // ── Upload via XHR ───────────────────────────────────────────────────────
  const uploadFileXHR = useCallback((file: File, tempId: string): Promise<StoredFile> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);

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
            resolve(JSON.parse(xhr.responseText));
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

      xhr.addEventListener("error", () => reject(new Error("Network error")));
      xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

      xhr.open("POST", "/api/files/upload");
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  }, []);

  const processFiles = useCallback(async (selectedFiles: File[]) => {
    const valid = selectedFiles.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        setGlobalError(`"${f.name}" exceeds 100MB limit`);
        return false;
      }
      return true;
    });
    if (!valid.length) return;
    setGlobalError(null);

    const tasks: UploadTask[] = valid.map((f) => ({
      file: f,
      progress: 0,
      status: "pending",
      tempId: `${Date.now()}-${Math.random()}`,
    }));
    setUploadTasks((prev) => [...prev, ...tasks]);

    await Promise.all(
      tasks.map(async (task) => {
        setUploadTasks((prev) =>
          prev.map((t) => (t.tempId === task.tempId ? { ...t, status: "uploading" } : t))
        );
        try {
          const result = await uploadFileXHR(task.file, task.tempId);
          // Instantly prepend to file list — no delay, no refetch
          setFiles((prev) => [result, ...prev]);
          setUploadTasks((prev) =>
            prev.map((t) => (t.tempId === task.tempId ? { ...t, status: "done", progress: 100 } : t))
          );
          setTimeout(() => {
            setUploadTasks((prev) => prev.filter((t) => t.tempId !== task.tempId));
          }, 2500);
        } catch (err: any) {
          setUploadTasks((prev) =>
            prev.map((t) =>
              t.tempId === task.tempId ? { ...t, status: "error", error: err.message } : t
            )
          );
        }
      })
    );
  }, [uploadFileXHR]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) processFiles(Array.from(e.dataTransfer.files));
  };

  // ── Delete (instant optimistic + REST) ──────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setIsDeleting(true);

    // Instantly remove from UI
    setFiles((prev) => prev.filter((f) => f.id !== target.id));
    setDeleteTarget(null);
    setIsDeleting(false);

    // Fire REST call in background
    try {
      await apiDeleteFile(target.id);
    } catch (err: any) {
      // Restore on failure
      setFiles((prev) => [target, ...prev]);
      setGlobalError(`Failed to delete "${target.fileName}": ${err.message}`);
    }
  };

  // ── Download ─────────────────────────────────────────────────────────────
  const handleDownload = async (file: StoredFile) => {
    apiIncrementDownload(file.id);
    // Update local count instantly
    setFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, downloads: (f.downloads || 0) + 1 } : f))
    );
    window.open(file.s3Url, "_blank");
  };

  // ── Filtered + sorted list ───────────────────────────────────────────────
  const displayedFiles = files
    .filter((f) => {
      if (filter !== "all" && getFileCategory(f.fileType, f.fileName) !== filter) return false;
      if (searchQuery) {
        return f.fileName.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === "newest") return new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime();
      if (sortOrder === "oldest") return new Date(a.uploadedAt || 0).getTime() - new Date(b.uploadedAt || 0).getTime();
      if (sortOrder === "name") return a.fileName.localeCompare(b.fileName);
      if (sortOrder === "size") return b.fileSize - a.fileSize;
      return 0;
    });

  // ── Counts per category ──────────────────────────────────────────────────
  const counts = {
    all: files.length,
    excel: files.filter((f) => getFileCategory(f.fileType, f.fileName) === "excel").length,
    pdf: files.filter((f) => getFileCategory(f.fileType, f.fileName) === "pdf").length,
    word: files.filter((f) => getFileCategory(f.fileType, f.fileName) === "word").length,
    other: files.filter((f) => getFileCategory(f.fileType, f.fileName) === "other").length,
  };

  // ════════════════════════════════════════════════════════════════════════════
  // Auth Screen
  // ════════════════════════════════════════════════════════════════════════════
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="flex justify-center">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg">
              <Lock className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">Files Access</h1>
            <p className="text-gray-500 text-sm">Enter password to manage files</p>
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
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Main Files UI
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-md">
              <FileDown className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Files Management</h1>
              <p className="text-gray-500 text-sm">{files.length} files stored</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-blue-50 border-blue-300 text-blue-700" : ""}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-blue-50 border-blue-300 text-blue-700" : ""}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Global Error ── */}
        {globalError && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600 flex-1">{globalError}</p>
            <button onClick={() => setGlobalError(null)}>
              <X className="h-4 w-4 text-red-400 hover:text-red-600" />
            </button>
          </div>
        )}

        {/* ── Upload Zone ── */}
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
          <p className="text-sm text-slate-400 mt-1">All file types · Up to 100MB · Multiple files at once</p>
        </div>

        {/* ── Active Upload Tasks ── */}
        {uploadTasks.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Uploading</h2>
            {uploadTasks.map((task) => (
              <div key={task.tempId} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <FileIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-700 flex-1 truncate">{task.file.name}</span>
                  <span className="text-xs text-slate-400">{formatFileSize(task.file.size)}</span>
                  {task.status === "uploading" && (
                    <span className="text-xs font-bold text-blue-600 min-w-[36px] text-right">{task.progress}%</span>
                  )}
                  {task.status === "done" && <span className="text-xs font-bold text-green-600">Done ✓</span>}
                  {task.status === "error" && <span className="text-xs font-bold text-red-500">Failed</span>}
                </div>
                {(task.status === "uploading" || task.status === "pending") && (
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                )}
                {task.status === "done" && (
                  <div className="w-full bg-green-100 rounded-full h-1.5">
                    <div className="h-1.5 bg-green-500 rounded-full w-full" />
                  </div>
                )}
                {task.status === "error" && (
                  <p className="text-xs text-red-500 mt-1">{task.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Filters + Search + Sort ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />
            {(["all", "excel", "pdf", "word", "other"] as FileFilter[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  filter === cat
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)} ({counts[cat]})
              </button>
            ))}

            {/* Sort */}
            <div className="ml-auto flex items-center gap-1">
              <SortAsc className="h-4 w-4 text-slate-400" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name A-Z</option>
                <option value="size">Largest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── File List / Grid ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Files ({displayedFiles.length})
            </h2>
          </div>

          {isLoadingFiles ? (
            <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : loadError ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-red-200">
              <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-2" />
              <p className="text-red-500 font-medium">{loadError}</p>
              <Button variant="outline" size="sm" onClick={loadFiles} className="mt-3">Retry</Button>
            </div>
          ) : displayedFiles.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <FileDown className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">
                {searchQuery || filter !== "all" ? "No files match your filter" : "No files yet"}
              </p>
              {(searchQuery || filter !== "all") && (
                <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setFilter("all"); }} className="mt-3">
                  Clear filters
                </Button>
              )}
            </div>
          ) : viewMode === "list" ? (
            // ── List View ──
            <div className="space-y-2">
              {displayedFiles.map((file) => {
                const cat = getFileCategory(file.fileType, file.fileName);
                return (
                  <div
                    key={file.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-blue-200 hover:shadow-sm transition-all"
                  >
                    <div className="bg-slate-50 p-2.5 rounded-lg flex-shrink-0">
                      {getFileIcon(file.fileType, file.fileName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{file.fileName}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getFileBadgeColor(cat)}`}>
                          {cat.toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-400">{formatFileSize(file.fileSize)}</span>
                        <span className="text-xs text-slate-400">{formatDate(file.uploadedAt)}</span>
                        {(file.downloads || 0) > 0 && (
                          <span className="text-xs text-slate-400">{file.downloads} downloads</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Copy link */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copy(file.id, file.s3Url)}
                        className="gap-1 text-slate-500 border-slate-200 hover:bg-slate-50 px-2"
                        title="Copy download link"
                      >
                        {copiedId === file.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      {/* Download */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(file)}
                        className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Download</span>
                      </Button>
                      {/* Delete */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(file)}
                        className="text-red-500 border-red-200 hover:bg-red-50 px-2"
                        title="Delete file"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // ── Grid View ──
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {displayedFiles.map((file) => {
                const cat = getFileCategory(file.fileType, file.fileName);
                return (
                  <div
                    key={file.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center gap-3 hover:border-blue-200 hover:shadow-md transition-all group"
                  >
                    <div className="bg-slate-50 p-4 rounded-xl group-hover:bg-blue-50 transition-colors">
                      {getFileIcon(file.fileType, file.fileName)}
                    </div>
                    <div className="w-full text-center">
                      <p className="text-xs font-medium text-slate-800 truncate w-full" title={file.fileName}>
                        {file.fileName}
                      </p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${getFileBadgeColor(cat)}`}>
                        {cat.toUpperCase()}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">{formatFileSize(file.fileSize)}</p>
                    </div>
                    <div className="flex items-center gap-1 w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copy(file.id, file.s3Url)}
                        className="flex-1 px-1 text-slate-500 border-slate-200 hover:bg-slate-50"
                        title="Copy link"
                      >
                        {copiedId === file.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(file)}
                        className="flex-1 px-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                        title="Download"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(file)}
                        className="flex-1 px-1 text-red-500 border-red-200 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete File
            </DialogTitle>
            <DialogDescription className="text-slate-600 pt-1">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-800">"{deleteTarget?.fileName}"</span>?
              <br />
              <span className="text-xs text-slate-400 mt-1 block">
                {deleteTarget && formatFileSize(deleteTarget.fileSize)} · Uploaded {formatDate(deleteTarget?.uploadedAt || null)}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
