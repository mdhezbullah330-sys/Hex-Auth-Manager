import React, { useState } from "react";
import {
  useGetApps, getGetAppsQueryKey,
  useCreateApp,
  useDeleteApp,
  useUpdateApp,
  useRotateAppToken,
  getGetAppQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, RotateCw, Pause, Play, Copy, Eye, EyeOff,
  Box, Users, Activity, Zap, Code2, Key, FileText, HardDrive, RefreshCw,
} from "lucide-react";

type AppTab = "overview" | "credentials" | "variables" | "files" | "example";

export default function AppsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: apps, isLoading } = useGetApps({ query: { queryKey: getGetAppsQueryKey() } });

  const createMutation = useCreateApp();
  const deleteMutation = useDeleteApp();
  const updateMutation = useUpdateApp();
  const rotateMutation = useRotateAppToken();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [newAppVersion, setNewAppVersion] = useState("1.0.0");
  const [activeTab, setActiveTab] = useState<AppTab>("overview");
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const selectedApp = apps?.find((a) => a.id === selectedId) ?? apps?.[0] ?? null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetAppsQueryKey() });
    if (selectedApp) queryClient.invalidateQueries({ queryKey: getGetAppQueryKey(selectedApp.id) });
  };

  const handleCreate = () => {
    if (!newAppName) return;
    createMutation.mutate(
      { data: { name: newAppName, version: newAppVersion } },
      {
        onSuccess: (app) => {
          invalidate();
          toast({ variant: "success", title: "App created" });
          setIsCreateOpen(false);
          setNewAppName("");
          setNewAppVersion("1.0.0");
          setSelectedId(app.id);
        },
        onError: (e: any) => toast({ variant: "destructive", title: "Failed", description: e?.data?.error || e?.message }),
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        invalidate();
        toast({ variant: "success", title: "App deleted" });
        setSelectedId(null);
      },
      onError: (e: any) => toast({ variant: "destructive", title: "Failed", description: e?.data?.error || e?.message }),
    });
  };

  const handleTogglePause = (app: typeof selectedApp) => {
    if (!app) return;
    const newStatus = app.status === "active" ? "paused" : "active";
    updateMutation.mutate(
      { id: app.id, data: { name: app.name, version: app.version, status: newStatus } },
      {
        onSuccess: () => { invalidate(); toast({ variant: "success", title: newStatus === "paused" ? "App paused" : "App resumed" }); },
        onError: (e: any) => toast({ variant: "destructive", title: "Failed", description: e?.data?.error }),
      }
    );
  };

  const handleRotate = (id: number) => {
    rotateMutation.mutate({ id }, {
      onSuccess: () => { invalidate(); toast({ variant: "success", title: "Token rotated" }); },
      onError: (e: any) => toast({ variant: "destructive", title: "Failed", description: e?.data?.error }),
    });
  };

  const copyToClipboard = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast({ title: `${label} copied` });
  };

  const totalApps = apps?.length ?? 0;
  const activeApps = apps?.filter((a) => a.status === "active").length ?? 0;
  const pausedApps = apps?.filter((a) => a.status === "paused").length ?? 0;
  const totalSessions = apps?.reduce((s, a) => s + (a.userCount ?? 0), 0) ?? 0;

  const tabs: { id: AppTab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: Zap },
    { id: "credentials", label: "Credentials", icon: Key },
    { id: "variables", label: "Variables", icon: FileText },
    { id: "files", label: "Files", icon: HardDrive },
    { id: "example", label: "Example Code", icon: Code2 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Applications</h1>
          <p className="text-muted-foreground text-sm mt-1">Applications are how your software talks to Hex Auth. Each one has its own users, keys, and settings.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Create application
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Application</DialogTitle>
              <DialogDescription>Add a new software product to protect.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>App Name</Label>
                <Input value={newAppName} onChange={(e) => setNewAppName(e.target.value)} placeholder="My Awesome Game" />
              </div>
              <div className="space-y-2">
                <Label>Initial Version</Label>
                <Input value={newAppVersion} onChange={(e) => setNewAppVersion(e.target.value)} placeholder="1.0.0" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newAppName || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "TOTAL APPS", value: totalApps, sub: "across your workspace", icon: Box, color: "text-foreground" },
          { label: "ACTIVE", value: activeApps, sub: "receiving traffic", icon: Activity, color: "text-green-500" },
          { label: "PAUSED", value: pausedApps, sub: "not accepting logins", icon: Pause, color: "text-yellow-500" },
          { label: "ACTIVE USERS", value: totalSessions, sub: "across all apps", icon: Users, color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{isLoading ? "—" : s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <s.icon className="w-3 h-3" /> {s.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 items-start">
        {/* Left: App list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <p className="font-semibold text-sm">Your applications</p>
              <p className="text-[11px] text-muted-foreground">{totalApps} total</p>
            </div>
            <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-3 h-3" /> New
            </Button>
          </div>

          <div className="divide-y divide-border">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))
            ) : apps && apps.length > 0 ? (
              apps.map((app) => {
                const isSelected = (selectedApp?.id ?? apps[0]?.id) === app.id;
                return (
                  <button
                    key={app.id}
                    onClick={() => { setSelectedId(app.id); setActiveTab("overview"); setShowSecret(false); setShowToken(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isSelected ? "bg-primary/10" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-primary/20" : "bg-muted"}`}>
                      <Box className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{app.name}</p>
                      <p className="text-[11px] text-muted-foreground">v{app.version} · {app.userCount} users</p>
                    </div>
                    <Badge
                      className={`text-[9px] px-1.5 py-0 h-4 shrink-0 ${
                        app.status === "active"
                          ? "bg-green-500/15 text-green-500 border-green-500/25"
                          : "bg-yellow-500/15 text-yellow-500 border-yellow-500/25"
                      }`}
                    >
                      {app.status}
                    </Badge>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <Box className="w-8 h-8 mx-auto mb-2 opacity-20" />
                No apps yet
              </div>
            )}
          </div>
        </div>

        {/* Right: Detail panel */}
        {selectedApp ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold">{selectedApp.name}</h2>
                <Badge className={`text-[10px] ${selectedApp.status === "active" ? "bg-green-500/15 text-green-500 border-green-500/25" : "bg-yellow-500/15 text-yellow-500 border-yellow-500/25"}`}>
                  ● {selectedApp.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-8"
                  onClick={() => handleTogglePause(selectedApp)}
                  disabled={updateMutation.isPending}
                >
                  {selectedApp.status === "active"
                    ? <><Pause className="w-3 h-3" /> Pause</>
                    : <><Play className="w-3 h-3" /> Resume</>}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 text-destructive border-destructive/20 hover:bg-destructive/10">
                      <Trash2 className="w-3 h-3" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {selectedApp.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. All users, licenses, and sessions associated with this app will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(selectedApp.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        Delete App
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border px-5 gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-5">
              {activeTab === "overview" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "VERSION", value: `v${selectedApp.version}` },
                      { label: "USERS", value: selectedApp.userCount ?? 0 },
                      { label: "CREATED", value: new Date(selectedApp.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
                    ].map((s) => (
                      <div key={s.label} className="bg-muted/30 border border-border rounded-lg p-3">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{s.label}</p>
                        <p className="text-xl font-bold">{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <p className="text-xs font-semibold text-primary mb-2">⚡ Quick start</p>
                    <p className="text-sm text-muted-foreground">Drop our SDK in your project and call <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">auth.login(key)</code>.</p>
                    <p className="text-xs text-muted-foreground mt-1">Check the <span className="text-primary cursor-pointer underline" onClick={() => setActiveTab("example")}>Example Code</span> tab for a complete setup.</p>
                  </div>
                </div>
              )}

              {activeTab === "credentials" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Keep these values secret. Rotate if compromised.</p>
                  {[
                    { label: "App ID", value: selectedApp.appId, mono: true, canHide: false },
                    { label: "API Token", value: selectedApp.apiToken, mono: true, canHide: true, shown: showToken, toggle: () => setShowToken((v) => !v) },
                    { label: "App Secret", value: selectedApp.appSecret, mono: true, canHide: true, shown: showSecret, toggle: () => setShowSecret((v) => !v) },
                  ].map((f) => (
                    <div key={f.label}>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">{f.label}</Label>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 bg-muted/40 border border-border rounded-lg px-3 py-2 font-mono text-xs overflow-hidden">
                          <span className="truncate block">
                            {f.canHide && !f.shown ? "•".repeat(32) : f.value}
                          </span>
                        </div>
                        {f.canHide && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={f.toggle}>
                            {f.shown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => copyToClipboard(f.value, f.label)}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" disabled={rotateMutation.isPending}>
                          <RefreshCw className="w-3 h-3" /> Rotate Token & Secret
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rotate credentials?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will generate a new API token and app secret. Your SDK integration will stop working until you update it with the new values.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRotate(selectedApp.id)}>Rotate</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}

              {activeTab === "variables" && (
                <div className="text-center py-10 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">App Variables</p>
                  <p className="text-sm mt-1">Store per-app config values accessible from the SDK.</p>
                  <p className="text-xs mt-1 text-muted-foreground/60">Coming soon</p>
                </div>
              )}

              {activeTab === "files" && (
                <div className="text-center py-10 text-muted-foreground">
                  <HardDrive className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">App Files</p>
                  <p className="text-sm mt-1">Host files your app can download through the SDK.</p>
                  <p className="text-xs mt-1 text-muted-foreground/60">Coming soon</p>
                </div>
              )}

              {activeTab === "example" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Python SDK quick-start using this app's credentials.</p>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
                      <span className="text-xs text-zinc-400 font-mono">main.py</span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs text-zinc-400 hover:text-white gap-1" onClick={() => copyToClipboard(
`from hexauth import HexAuth

auth = HexAuth(
    app_id="${selectedApp.appId}",
    app_secret="${selectedApp.appSecret}"
)

result = auth.login(license_key="YOUR_LICENSE_KEY")

if result.success:
    print("Logged in as:", result.user.username)
else:
    print("Login failed:", result.error)`,
                        "Example code"
                      )}>
                        <RotateCw className="w-3 h-3" /> Copy
                      </Button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
{`from hexauth import HexAuth

auth = HexAuth(
    app_id=`}<span className="text-amber-300">"{selectedApp.appId}"</span>{`,
    app_secret=`}<span className="text-amber-300">"{selectedApp.appSecret}"</span>{`
)

result = auth.login(license_key=`}<span className="text-green-400">"YOUR_LICENSE_KEY"</span>{`)

if result.success:
    print(`}<span className="text-green-400">"Logged in as:"</span>{`, result.user.username)
else:
    print(`}<span className="text-red-400">"Login failed:"</span>{`, result.error)`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : !isLoading && (
          <div className="bg-card border border-border rounded-xl flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Box className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No app selected</p>
              <p className="text-sm mt-1">Create an app or select one from the list.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
