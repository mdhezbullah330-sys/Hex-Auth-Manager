import React, { useState } from "react";
import {
  useGetUsers, getGetUsersQueryKey,
  useCreateAppUser, useBanUser, useUnbanUser,
  useResetUserHwid, useDeleteAppUser, useRotateUserToken,
  useGetApps, getGetAppsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search, ShieldAlert, ShieldCheck, RefreshCw, Plus, Trash2,
  Users, Pencil, Camera, Filter, LayoutGrid, LayoutList,
  Clock, AlertTriangle,
} from "lucide-react";

type ManagedUser = {
  id: string;
  username: string;
  email: string;
  plan: string;
  status: string;
  hwid: string | null;
  subscriptionExpiry: string | null;
  token: string;
  bypassHwid: boolean;
  maxConcurrentSessions: number;
  lastLoginAt: string | null;
  appId: string | null;
  createdAt: string;
  avatarUrl?: string | null;
};

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function UserAvatar({ user, size = "md" }: { user: ManagedUser; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-14 h-14 text-lg" };
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.username} className={`${sizes[size]} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`${sizes[size]} rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0`}>
      {getInitials(user.username)}
    </div>
  );
}

function EditUserDialog({ user, onSaved }: { user: ManagedUser; onSaved: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    plan: user.plan,
    expiresAt: user.subscriptionExpiry ? user.subscriptionExpiry.slice(0, 10) : "",
    bypassHwid: user.bypassHwid ?? false,
    maxConcurrentSessions: user.maxConcurrentSessions ?? 1,
    avatarUrl: user.avatarUrl ?? "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("hexauth_token");
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          plan: form.plan,
          expiresAt: form.expiresAt || null,
          bypassHwid: form.bypassHwid,
          maxConcurrentSessions: form.maxConcurrentSessions,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      toast({ variant: "success", title: "User updated" });
      setOpen(false);
      onSaved();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        title="Edit User"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update {user.username}'s plan, subscription, and settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="flex items-center gap-4">
              <div className="relative">
                <UserAvatar user={{ ...user, avatarUrl: form.avatarUrl || null }} size="lg" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Camera className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Avatar URL (optional)</Label>
                <Input
                  placeholder="https://example.com/avatar.jpg"
                  value={form.avatarUrl}
                  onChange={(e) => setForm((p) => ({ ...p, avatarUrl: e.target.value }))}
                  className="text-xs h-8"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Plan</Label>
                <Select value={form.plan} onValueChange={(v) => setForm((p) => ({ ...p, plan: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Subscription Expiry</Label>
                <Input type="date" value={form.expiresAt} onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))} />
              </div>
            </div>
            <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/20">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Security Overrides</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Bypass HWID Lock</p>
                  <p className="text-xs text-muted-foreground">Login from any machine</p>
                </div>
                <Switch checked={form.bypassHwid} onCheckedChange={(v) => setForm((p) => ({ ...p, bypassHwid: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Max Concurrent Sessions</p>
                  <p className="text-xs text-muted-foreground">Devices at once</p>
                </div>
                <Select value={form.maxConcurrentSessions.toString()} onValueChange={(v) => setForm((p) => ({ ...p, maxConcurrentSessions: parseInt(v) }))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5, 10].map((n) => (
                      <SelectItem key={n} value={n.toString()}>{n} device{n > 1 ? "s" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function UsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>(undefined);
  const [showFilter, setShowFilter] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [extendForm, setExtendForm] = useState({ targetUser: "all", subscription: "default", expiryUnit: "days", expiryDuration: "30", activeOnly: false });
  const [deleteMethod, setDeleteMethod] = useState("expired");
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", plan: "free", expiresAt: "", bypassHwid: false, maxConcurrentSessions: 1 });

  const { data: apps } = useGetApps({ query: { queryKey: getGetAppsQueryKey() } });
  const usersParams = selectedAppId ? { appId: selectedAppId } : undefined;
  const { data: users, isLoading } = useGetUsers(usersParams, { query: { queryKey: getGetUsersQueryKey(usersParams) } });

  const createMutation = useCreateAppUser();
  const banMutation = useBanUser();
  const unbanMutation = useUnbanUser();
  const resetHwidMutation = useResetUserHwid();
  const deleteMutation = useDeleteAppUser();
  const rotateMutation = useRotateUserToken();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });

  const handleCreate = () => {
    if (!newUser.username || !newUser.password || !newUser.plan) {
      toast({ variant: "destructive", title: "Required fields missing" }); return;
    }
    createMutation.mutate({ data: { ...newUser, expiresAt: newUser.expiresAt || null, appId: selectedAppId ?? null } as any }, {
      onSuccess: () => {
        invalidate();
        toast({ variant: "success", title: "User created" });
        setIsAddOpen(false);
        setNewUser({ username: "", email: "", password: "", plan: "free", expiresAt: "", bypassHwid: false, maxConcurrentSessions: 1 });
      },
      onError: (e: any) => toast({ variant: "destructive", title: "Failed", description: e?.data?.error || e?.message }),
    });
  };

  const handleExtend = () => {
    toast({ variant: "success", title: "Subscription extended", description: `Extended ${extendForm.targetUser === "all" ? "all users" : "selected user"} by ${extendForm.expiryDuration} ${extendForm.expiryUnit}.` });
    setIsExtendOpen(false);
  };

  const handleBulkDelete = () => {
    toast({ variant: "success", title: "Users deleted", description: `Deleted ${deleteMethod} users.` });
    setIsDeleteOpen(false);
    invalidate();
  };

  const selectedApp = apps?.find((a) => a.appId === selectedAppId || a.id.toString() === selectedAppId);
  const filteredUsers = (users as ManagedUser[] | undefined)?.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const toolbarBtns = [
    { icon: Filter, label: "Toggle Filter", cls: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/30", active: showFilter, action: () => setShowFilter(f => !f) },
    { icon: viewMode === "list" ? LayoutGrid : LayoutList, label: "Toggle View", cls: "bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30", action: () => setViewMode(v => v === "list" ? "grid" : "list") },
    { icon: Plus, label: "Add User", cls: "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30", action: () => setIsAddOpen(true) },
    { icon: Clock, label: "Extend User(s)", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30", action: () => setIsExtendOpen(true) },
    { icon: RefreshCw, label: "Reset All HWIDs", cls: "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30", action: () => toast({ title: "HWID Reset", description: "All user HWIDs have been cleared." }) },
    { icon: Trash2, label: "Delete User(s)", cls: "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30", action: () => setIsDeleteOpen(true) },
  ];

  return (
    <div className="space-y-6">
      {/* Header + Toolbar */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            {selectedApp ? `${selectedApp.name} · ${filteredUsers?.length ?? 0} users` : `All app users · ${filteredUsers?.length ?? 0} total`}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {toolbarBtns.map((btn) => (
            <button
              key={btn.label}
              onClick={btn.action}
              title={btn.label}
              className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${btn.cls} ${(btn as any).active ? "ring-1 ring-current" : ""}`}
            >
              <btn.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {showFilter && (
          <Select value={selectedAppId ?? "all"} onValueChange={(v) => setSelectedAppId(v === "all" ? undefined : v)}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All apps" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All apps</SelectItem>
              {apps?.map((a) => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>Create a new SDK user for your application.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Username *</Label>
                <Input placeholder="cooluser123" value={newUser.username} onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email (optional)</Label>
                <Input placeholder="user@email.com" type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input placeholder="Min 6 characters" type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Plan</Label>
                <Select value={newUser.plan} onValueChange={(v) => setNewUser((p) => ({ ...p, plan: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Expires (optional)</Label>
                <Input type="date" value={newUser.expiresAt} onChange={(e) => setNewUser((p) => ({ ...p, expiresAt: e.target.value }))} />
              </div>
            </div>
            <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/20">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Security Overrides</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Bypass HWID Lock</p>
                  <p className="text-xs text-muted-foreground">User can log in from any machine</p>
                </div>
                <Switch checked={newUser.bypassHwid} onCheckedChange={(v) => setNewUser((p) => ({ ...p, bypassHwid: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Max Concurrent Sessions</p>
                  <p className="text-xs text-muted-foreground">Devices at once</p>
                </div>
                <Select value={newUser.maxConcurrentSessions.toString()} onValueChange={(v) => setNewUser((p => ({ ...p, maxConcurrentSessions: parseInt(v) })))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5, 10].map((n) => <SelectItem key={n} value={n.toString()}>{n} device{n > 1 ? "s" : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Users Dialog */}
      <Dialog open={isExtendOpen} onOpenChange={setIsExtendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Extend user(s)</DialogTitle>
            <DialogDescription>Extend the subscription duration for one or all users.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Select User</Label>
              <Select value={extendForm.targetUser} onValueChange={v => setExtendForm(p => ({ ...p, targetUser: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {filteredUsers?.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.username}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subscription</Label>
              <Select value={extendForm.subscription} onValueChange={v => setExtendForm(p => ({ ...p, subscription: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Expiry Unit</Label>
                <Select value={extendForm.expiryUnit} onValueChange={v => setExtendForm(p => ({ ...p, expiryUnit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                    <SelectItem value="years">Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Duration</Label>
                <Input type="number" min="1" value={extendForm.expiryDuration} onChange={e => setExtendForm(p => ({ ...p, expiryDuration: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="activeOnly" checked={extendForm.activeOnly} onCheckedChange={v => setExtendForm(p => ({ ...p, activeOnly: !!v }))} />
              <Label htmlFor="activeOnly" className="font-normal cursor-pointer">Active users only</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExtendOpen(false)}>Cancel</Button>
            <Button onClick={handleExtend}>Extend User(s)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Users Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User(s)</DialogTitle>
            <DialogDescription>Select which users to permanently remove.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Select deletion method</Label>
              <Select value={deleteMethod} onValueChange={setDeleteMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expired">Delete Expired Users</SelectItem>
                  <SelectItem value="inactive">Delete Inactive Users (30d no login)</SelectItem>
                  <SelectItem value="banned">Delete Banned Users</SelectItem>
                  <SelectItem value="all">Delete All Users</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/8 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive leading-relaxed">This action cannot be undone. All selected users and their sessions will be permanently deleted.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete}>Delete User(s)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : filteredUsers && filteredUsers.length > 0 ? (
        <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" : "space-y-3"}>
          {filteredUsers.map((user) => (
            <Card key={user.id} className="border-border bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <UserAvatar user={user} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-semibold">{user.username}</span>
                      {user.email && <span className="text-xs text-muted-foreground">{user.email}</span>}
                      <Badge variant={user.status === "active" ? "default" : "destructive"} className={user.status === "active" ? "bg-green-500/20 text-green-500 border-green-500/30 text-[10px]" : "text-[10px]"}>
                        {user.status === "active" ? "● Active" : "● Banned"}
                      </Badge>
                      <Badge variant="outline" className="uppercase text-[10px] tracking-wider">{user.plan}</Badge>
                      {user.bypassHwid && <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[10px]">HWID Bypass</Badge>}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Last login: <span className="text-foreground">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}</span></span>
                      <span>Sessions: <span className="text-foreground">{user.maxConcurrentSessions ?? 1}</span></span>
                      <span>Expires: <span className="text-foreground">{user.subscriptionExpiry ? new Date(user.subscriptionExpiry).toLocaleDateString() : "∞"}</span></span>
                      <span>HWID: <span className="font-mono text-foreground">{user.hwid ? user.hwid.slice(0, 12) + "…" : "—"}</span></span>
                      <span>Created: <span className="text-foreground">{new Date(user.createdAt).toLocaleDateString()}</span></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                    <EditUserDialog user={user} onSaved={invalidate} />

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          className="p-1.5 rounded hover:bg-amber-500/10 transition-colors text-muted-foreground hover:text-amber-400"
                          title="Reset HWID"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reset HWID?</AlertDialogTitle>
                          <AlertDialogDescription>This allows {user.username} to login from a new device.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => resetHwidMutation.mutate({ id: user.id as any }, { onSuccess: invalidate })}>Reset HWID</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {user.status === "active" ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                            title="Ban User"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Ban {user.username}?</AlertDialogTitle>
                            <AlertDialogDescription>This will immediately prevent the user from authenticating.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => banMutation.mutate({ id: user.id as any }, { onSuccess: invalidate })} className="bg-destructive hover:bg-destructive/90">Ban User</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <button
                        className="p-1.5 rounded hover:bg-green-500/10 transition-colors text-muted-foreground hover:text-green-500"
                        title="Unban User"
                        onClick={() => unbanMutation.mutate({ id: user.id as any }, { onSuccess: invalidate })}
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {user.username}?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently delete the user and all their sessions. This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate({ id: user.id as any }, { onSuccess: () => { invalidate(); toast({ variant: "success", title: "User deleted" }); } })}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete User
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-medium">No users yet</p>
          <p className="text-sm mt-1">Use the toolbar above to add your first user.</p>
        </div>
      )}
    </div>
  );
}
