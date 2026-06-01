import React, { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");

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

  const handleProfileUpdate = () => {
    updateProfileMutation.mutate({ data: profileData }, {
      onSuccess: () => {
        toast({ variant: "success", title: "Profile updated" });
      },
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

  const handleInvite = () => {
    inviteMutation.mutate({ data: inviteData }, {
      onSuccess: () => {
        toast({ variant: "success", title: "Invite sent", description: `They will receive an email with an accept link.` });
        setInviteData({ email: "", role: "viewer" });
      },
      onError: (err: any) => toast({ variant: "destructive", title: "Invite failed", description: err?.data?.error || err?.message })
    });
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
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Invite Team Member</CardTitle>
                  <CardDescription>Invite a collaborator to your workspace.</CardDescription>
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
                    <Button onClick={handleInvite} disabled={!inviteData.email || inviteMutation.isPending}>Send Invite</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {teamLoading ? <Skeleton className="h-12 w-full" /> : 
                     team && team.length > 0 ? team.map(member => (
                       <div key={member.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                         <div>
                           <p className="font-medium">{member.username} {member.isYou && <span className="text-xs text-muted-foreground ml-2">(You)</span>}</p>
                           <p className="text-sm text-muted-foreground">{member.email}</p>
                         </div>
                         <div className="flex items-center gap-4">
                           <span className="text-xs uppercase tracking-wider font-semibold text-primary">{member.role}</span>
                           {!member.isYou && (
                             <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10"
                               onClick={() => removeMemberMutation.mutate({ id: member.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTeamQueryKey() }) })}
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                           )}
                         </div>
                       </div>
                     )) : <p className="text-muted-foreground text-sm">No other team members yet.</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="integrations">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Discord Webhooks</CardTitle>
                <CardDescription>Send real-time alerts to a Discord channel.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-w-xl">
                  <Label>Webhook URL</Label>
                  <Input placeholder="https://discord.com/api/webhooks/..." value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">We will send notifications for new users, banned users, and failed logins.</p>
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
              <CardContent>
                <div className="p-4 border border-primary/20 bg-primary/5 rounded-lg max-w-xl mb-6">
                  <h4 className="font-semibold mb-2">Redeem Upgrade Code</h4>
                  <p className="text-sm text-muted-foreground mb-4">If you've purchased a plan via our local payment methods, enter the code provided by support here.</p>
                  <div className="flex gap-2">
                    <Input placeholder="HEX-UPGRADE-XXXX" />
                    <Button onClick={() => toast({ title: "Invalid Code", variant: "destructive" })}>Apply</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}