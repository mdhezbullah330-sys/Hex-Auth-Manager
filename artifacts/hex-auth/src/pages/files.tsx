import React, { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, Download, FolderOpen, FileText, File, Image, Archive } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";

const FILES_KEY = ["files"];

type AppFile = {
  id: string;
  name: string;
  filename: string;
  size: number;
  mimeType: string;
  requiredPlan: string;
  note: string | null;
  downloads: number;
  fileId: string;
  createdAt: string;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image className="w-5 h-5 text-blue-400" />;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar")) return <Archive className="w-5 h-5 text-amber-400" />;
  if (mimeType.startsWith("text/")) return <FileText className="w-5 h-5 text-green-400" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
}

function planBadge(plan: string) {
  const styles: Record<string, string> = {
    free: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    starter: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    pro: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };
  return (
    <Badge className={`${styles[plan] ?? styles.free} text-[10px] uppercase tracking-wider`}>{plan}</Badge>
  );
}

function useGetFiles() {
  const token = localStorage.getItem("hexauth_token");
  const workspace = (() => { try { return JSON.parse(localStorage.getItem("selectedProject") || "null"); } catch { return null; } })();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (workspace?.ownerId) headers["x-workspace-id"] = workspace.ownerId;

  return useQuery<AppFile[]>({
    queryKey: FILES_KEY,
    queryFn: async () => {
      const res = await fetch("/api/files", { headers });
      if (!res.ok) throw new Error("Failed to fetch files");
      return res.json();
    },
  });
}

function useUploadFile() {
  const token = localStorage.getItem("hexauth_token");
  const workspace = (() => { try { return JSON.parse(localStorage.getItem("selectedProject") || "null"); } catch { return null; } })();
  const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  if (workspace?.ownerId) headers["x-workspace-id"] = workspace.ownerId;

  return useMutation({
    mutationFn: async (data: {
      name: string; filename: string; mimeType: string;
      requiredPlan: string; note: string; data: string;
    }) => {
      const res = await fetch("/api/files", { method: "POST", headers, body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      return json;
    },
  });
}

function useDeleteFile() {
  const token = localStorage.getItem("hexauth_token");
  const workspace = (() => { try { return JSON.parse(localStorage.getItem("selectedProject") || "null"); } catch { return null; } })();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (workspace?.ownerId) headers["x-workspace-id"] = workspace.ownerId;

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
  });
}

export default function FilesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AppFile | null>(null);
  const [uploadForm, setUploadForm] = useState({
    name: "", requiredPlan: "free", note: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);

  const { data: files, isLoading } = useGetFiles();
  const uploadMutation = useUploadFile();
  const deleteMutation = useDeleteFile();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: FILES_KEY });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Maximum file size is 5MB" });
      return;
    }
    setSelectedFile(file);
    if (!uploadForm.name) setUploadForm(p => ({ ...p, name: file.name.replace(/\.[^/.]+$/, "") }));

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setFileData(result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (!selectedFile || !fileData) {
      toast({ variant: "destructive", title: "No file selected" }); return;
    }
    uploadMutation.mutate(
      {
        name: uploadForm.name || selectedFile.name,
        filename: selectedFile.name,
        mimeType: selectedFile.type || "application/octet-stream",
        requiredPlan: uploadForm.requiredPlan,
        note: uploadForm.note,
        data: fileData,
      },
      {
        onSuccess: () => {
          invalidate();
          toast({ variant: "success", title: "File uploaded successfully" });
          setIsUploadOpen(false);
          setSelectedFile(null);
          setFileData(null);
          setUploadForm({ name: "", requiredPlan: "free", note: "" });
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
        onError: (e: any) => toast({ variant: "destructive", title: "Upload failed", description: e.message }),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        invalidate();
        toast({ variant: "success", title: "File deleted" });
        setDeleteTarget(null);
      },
      onError: () => toast({ variant: "destructive", title: "Delete failed" }),
    });
  };

  const handleDownload = (file: AppFile) => {
    window.open(`/api/files/${file.fileId}/download`, "_blank");
  };

  const copyFileId = (fileId: string) => {
    navigator.clipboard.writeText(fileId);
    toast({ title: "Copied", description: "File ID copied to clipboard" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Files</h1>
          <p className="text-muted-foreground">
            {files ? `${files.length} file${files.length !== 1 ? "s" : ""} stored` : "Manage downloadable files for your users"}
          </p>
        </div>
        <Button onClick={() => setIsUploadOpen(true)} className="gap-2 shrink-0">
          <Upload className="w-4 h-4" /> Upload File
        </Button>
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>Upload a file for your users. Maximum size: 5MB.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* File picker */}
            <div
              className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <div className="flex items-center gap-3 justify-center">
                  {fileIcon(selectedFile.type)}
                  <div className="text-left">
                    <p className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Click to select a file</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Max 5MB</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Display Name</Label>
              <Input
                placeholder="My Tool v1.0"
                value={uploadForm.name}
                onChange={e => setUploadForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Required Plan</Label>
              <Select value={uploadForm.requiredPlan} onValueChange={v => setUploadForm(p => ({ ...p, requiredPlan: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input
                placeholder="e.g. Version 1.2.3 — patch release"
                value={uploadForm.note}
                onChange={e => setUploadForm(p => ({ ...p, note: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploadMutation.isPending}>
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the file and all associated download links. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete File
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : files && files.length > 0 ? (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Size</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Required Plan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Downloads</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">File ID</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {fileIcon(file.mimeType)}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate max-w-[180px]">{file.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">{file.filename}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                    {formatBytes(file.size)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {planBadge(file.requiredPlan)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                    {file.downloads.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <button
                      onClick={() => copyFileId(file.fileId)}
                      className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors truncate max-w-[140px] block"
                      title="Click to copy"
                    >
                      {file.fileId.slice(0, 16)}…
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleDownload(file)}
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(file)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl bg-muted/10">
          <FolderOpen className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-semibold text-lg mb-1">No files yet</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs">
            Upload files to make them available for your users to download.
          </p>
          <Button onClick={() => setIsUploadOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" /> Upload Your First File
          </Button>
        </div>
      )}
    </div>
  );
}
