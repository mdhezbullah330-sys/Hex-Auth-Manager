import React, { useState, useEffect } from "react";
import { 
  useGetSettings, getGetSettingsQueryKey,
  useUpdateProfile, useUpdatePassword, useUpdateWebhook,
  useGetTeam, getGetTeamQueryKey, useInviteTeamMember, useRemoveTeamMember
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Clock, CheckCircle2, Crown, Shield, Eye, Globe, Monitor, Smartphone, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";

type AccountLog = {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
};

function parseUserAgent(ua: string) {
  let browser = "Unknown Browser";
  let os = "Unknown OS";

  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";

  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return { browser, os };
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  
  const tabFromUrl = new URLSearchParams(location.split("?")[1] || "").get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "profile");

  const { data: team, isLoading: teamLoading } = useGetTeam({ query: { queryKey: getGetTeamQueryKey() } });
  
  const updateProfileMutation = useUpdateProfile();
  const updatePasswordMutation = useUpdatePassword();
  const updateWebhookMutation = useUpdateWebhook();
  const inviteMutation = useInviteTeamMember();
  const removeMemberMutation = useRemoveTeamMember();

  const [profileData, setProfileData] = useState({ username: user?.username || "", email: user?.email || "" });
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "" });
  const [webhookUrl, setWebhookUrl] = useState(user?.webhookUrl || "");
  const [inviteData, setInviteData] = useState({ email: "", role: "viewer" });

  const [accountLogs, setAccountLogs] = useState<AccountLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const isOwner = user?.role === "owner";

  useEffect(() => {
    if (activeTab === "logs") {
      fetchLogs();
    }
  }, [activeTab]);

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const token = localStorage.getItem("hexauth_token");
      const res = await fetch("/api/auth/account-logs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAccountLogs(data);
      }
    } catch {
      // ignore
    } finally {
      setLogsLoading(false);
    }
  };

  const handleProfileUpdate = () => {
    updateProfileMutation.mutate({ data: profileData }, {
      onSuccess: () => toast({ variant: "success", title: "Profile updated" }),
      onError: (err: any) => toast({ variant: "destructive", title: "Update failed", description: err?.data?.error || err?.message })
    });
  };

  const handlePasswordUpdate = () => {
    updatePasswordMutation.mutate({ data: passwordData }, {
      onSuccess: () => {
        toast({ variant: "success", title: "Password updated" });
        setPasswordData({ currentPassword: "", newPassword: "" });
      },
      onError: (err: any) => toast({ variant: "destructive", title: "Update failed", description: err?.data?.error || err?.message })
    });
  };

  const handleWebhookUpdate = () => {
    updateWebhookMutation.mutate({ data: { webhookUrl: webhookUrl || null } }, {
      onSuccess: () => toast({ variant: "success", title: "Webhook settings updated" }),
      onError: (err: any) => toast({ variant: "destructive", title: "Update failed", description: err?.data?.error || err?.message })
    });
  };

  const handleWebhookRemove = () => {
    setWebhookUrl("");
    updateWebhookMutation.mutate({ data: { webhookUrl: null } }, {
      onSuccess: () => toast({ variant: "success", title: "Webhook removed" }),
      onError: (err: any) => toast({ variant: "destructive", title: "Update failed", description: err?.data?.error || err?.message })
    });
  };

  const handleInvite = () => {
    inviteMutation.mutate({ data: inviteData }, {
      onSuccess: () => {
        toast({ variant: "success", title: "Invite sent", description: `Invitation email sent to ${inviteData.email}.` });
        setInviteData({ email: "", role: "viewer" });
        queryClient.invalidateQueries({ queryKey: getGetTeamQueryKey() });
      },
      onError: (err: any) => toast({ variant: "destructive", title: "Invite failed", description: err?.data?.error || err?.message })
    });
  };

  const handleRemove = (id: any) => {
    removeMemberMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ variant: "success", title: "Member removed" });
        queryClient.invalidateQueries({ queryKey: getGetTeamQueryKey() });
      },
      onError: (err: any) => toast({ variant: "destructive", title: "Failed to remove", description: err?.data?.error || err?.message })
    });
  };

  const roleIcon = (role: string) => {
    if (role === "owner") return <Crown className="w-3.5 h-3.5 text-yellow-500" />;
    if (role === "admin") return <Shield className="w-3.5 h-3.5 text-blue-500" />;
    return <Eye className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const roleBadgeClass = (role: string) => {
    if (role === "owner") return "border-yellow-500/40 text-yellow-500 bg-yellow-500/10";
    if (role === "admin") return "border-blue-500/40 text-blue-500 bg-blue-500/10";
    return "border-border text-muted-foreground";
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account, team, and integrations.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-card border border-border w-full justify-start h-auto flex-wrap p-1">
          <TabsTrigger value="profile" className="data-[state=active]:bg-background">Profile</TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-background">Security</TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-background">Team</TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-background">Integrations</TabsTrigger>
          <TabsTrigger value="plan" className="data-[state=active]:bg-background">Plan & Billing</TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-background">Logs</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="profile">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your account details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-w-md">
                  <Label>Username</Label>
                  <Input value={profileData.username} onChange={e => setProfileData({...profileData, username: e.target.value})} />
                </div>
                <div className="space-y-2 max-w-md">
                  <Label>Email</Label>
                  <Input type="email" value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleProfileUpdate} disabled={updateProfileMutation.isPending}>Save Changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Ensure your account is using a long, random password to stay secure.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-w-md">
                  <Label>Current Password</Label>
                  <Input type="password" value={passwordData.currentPassword} onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})} />
                </div>
                <div className="space-y-2 max-w-md">
                  <Label>New Password</Label>
                  <Input type="password" value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handlePasswordUpdate} disabled={!passwordData.currentPassword || !passwordData.newPassword || updatePasswordMutation.isPending}>Update Password</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <div className="space-y-6">
              {isOwner && (
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Invite Team Member</CardTitle>
                    <CardDescription>Invite a collaborator to your workspace. They will receive an email with an accept link.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-4 max-w-xl">
                      <div className="space-y-2 flex-1">
                        <Label>Email</Label>
                        <Input placeholder="colleague@example.com" value={inviteData.email} onChange={e => setInviteData({...inviteData, email: e.target.value})} />
                      </div>
                      <div className="space-y-2 w-32 shrink-0">
                        <Label>Role</Label>
                        <Select value={inviteData.role} onValueChange={v => setInviteData({...inviteData, role: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleInvite} disabled={!inviteData.email || inviteMutation.isPending}>
                        {inviteMutation.isPending ? "Sending..." : "Send Invite"}
                      </Button>
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground space-y-1">
                      <p><span className="font-semibold text-blue-500">Admin</span> — can create, edit, and delete resources.</p>
                      <p><span className="font-semibold text-foreground/60">Viewer</span> — read-only access, cannot make changes.</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>People with access to your workspace.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {teamLoading ? (
                      [1,2].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
                    ) : team && team.length > 0 ? team.map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/50">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                            {member.username?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <p className="font-medium text-sm flex items-center gap-1.5">
                              {member.username}
                              {member.isYou && <span className="text-xs text-muted-foreground">(You)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {member.status === "pending" ? (
                            <Badge variant="outline" className="border-yellow-500/40 text-yellow-500 bg-yellow-500/10 gap-1">
                              <Clock className="w-3 h-3" /> Pending
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 bg-emerald-500/10 gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </Badge>
                          )}
                          <Badge variant="outline" className={`gap-1 text-xs ${roleBadgeClass(member.role)}`}>
                            {roleIcon(member.role)}
                            {member.role}
                          </Badge>
                          {isOwner && !member.isYou && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove {member.username}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove <strong>{member.email}</strong> from your team. They will lose access immediately.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRemove(member.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    )) : (
                      <p className="text-muted-foreground text-sm py-4 text-center">No team members yet. Invite someone above.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="integrations">
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#5865F2]/20 border border-[#5865F2]/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#7983f5]" viewBox="0 0 127.14 96.36" fill="currentColor">
                      <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle>Discord Webhooks</CardTitle>
                    <CardDescription>Send real-time alerts to a Discord channel when users login, get banned, or HWID changes.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-w-xl">
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://discord.com/api/webhooks/..."
                      value={webhookUrl}
                      onChange={e => setWebhookUrl(e.target.value)}
                      className="flex-1"
                    />
                    {webhookUrl && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleWebhookRemove}
                        className="shrink-0 text-destructive border-destructive/20 hover:bg-destructive/10"
                        title="Remove webhook"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Notifications are sent for: login success, login failure, HWID mismatch, and user bans.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl">
                  {[
                    { label: "login.ok", desc: "Successful SDK login", color: "text-green-500 bg-green-500/10 border-green-500/20" },
                    { label: "hwid.deny", desc: "HWID mismatch detected", color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
                    { label: "user.ban", desc: "User ban event", color: "text-red-500 bg-red-500/10 border-red-500/20" },
                  ].map(e => (
                    <div key={e.label} className={`p-2 rounded-lg border text-xs ${e.color}`}>
                      <p className="font-mono font-bold">{e.label}</p>
                      <p className="text-muted-foreground mt-0.5">{e.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleWebhookUpdate} disabled={updateWebhookMutation.isPending}>Save Webhook</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="plan">
            <Card className="border-border bg-card/50">
              <CardHeader>
                <CardTitle>Current Plan: <span className="text-primary uppercase tracking-wider">{user?.plan || 'FREE'}</span></CardTitle>
                <CardDescription>Upgrade your plan to unlock more limits and features.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border border-primary/20 bg-primary/5 rounded-lg max-w-xl">
                  <h4 className="font-semibold mb-2">Redeem Upgrade Code</h4>
                  <p className="text-sm text-muted-foreground mb-4">If you've purchased a plan via our local payment methods, enter the code provided by support here.</p>
                  <div className="flex gap-2">
                    <Input placeholder="HEX-UPGRADE-XXXX" />
                    <Button onClick={() => toast({ title: "Invalid Code", variant: "destructive" })}>Apply</Button>
                  </div>
                </div>
                <div className="max-w-xl">
                  <a href="/upgrade" className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium">
                    View all plans and payment methods →
                  </a>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Account Login Logs</CardTitle>
                    <CardDescription>Recent dashboard login sessions for your account.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchLogs} disabled={logsLoading}>
                    {logsLoading ? "Loading..." : "Refresh"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                  </div>
                ) : accountLogs.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Globe className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No login records yet</p>
                    <p className="text-sm mt-1">Login records will appear here after you next sign in.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {accountLogs.map((log) => {
                      const { browser, os } = parseUserAgent(log.userAgent);
                      const date = new Date(log.createdAt);
                      const isMobile = log.userAgent.includes("Mobile") || log.userAgent.includes("Android") || log.userAgent.includes("iPhone");
                      return (
                        <div key={log.id} className="flex items-center gap-4 p-3 border border-border rounded-lg bg-card/40">
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                            {isMobile ? <Smartphone className="w-4 h-4 text-muted-foreground" /> : <Monitor className="w-4 h-4 text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{browser} on {os}</span>
                              <Badge variant="outline" className="text-[10px] font-mono">{log.ipAddress}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate" title={log.userAgent}>
                              {log.userAgent.slice(0, 80)}{log.userAgent.length > 80 ? "…" : ""}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground shrink-0 text-right">
                            <p>{date.toLocaleDateString()}</p>
                            <p>{date.toLocaleTimeString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
