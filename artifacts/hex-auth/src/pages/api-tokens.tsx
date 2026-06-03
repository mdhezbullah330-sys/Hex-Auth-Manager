import React, { useState } from "react";
import {
  useGetUsers, getGetUsersQueryKey,
  useRotateUserToken,
  useDeleteAppUser,
  useGetApps, getGetAppsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Check, RotateCw, Trash2, KeyRound } from "lucide-react";

export default function ApiTokensPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<any>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>(undefined);

  const { data: apps } = useGetApps({ query: { queryKey: getGetAppsQueryKey() } });
  const usersParams = selectedAppId ? { appId: selectedAppId } : undefined;
  const { data: users, isLoading } = useGetUsers(usersParams, {
    query: { queryKey: getGetUsersQueryKey(usersParams) }
  });

  const rotateMutation = useRotateUserToken();
  const deleteMutation = useDeleteAppUser();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
  };

  const copyToken = (token: string, id: any) => {
    navigator.clipboard.writeText(token);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ variant: "success", title: "Token copied to clipboard" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Tokens</h1>
          <p className="text-muted-foreground">
            Personal tokens for SDK authentication. Treat them like passwords — rotate often.
          </p>
        </div>
        <Select value={selectedAppId ?? "all"} onValueChange={v => setSelectedAppId(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All apps" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All apps</SelectItem>
            {apps?.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : users && users.length > 0 ? (
            <div className="divide-y divide-border">
              <div className="grid grid-cols-[2rem_1fr_2fr_1fr_1fr_6rem] gap-4 px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                <span>#</span>
                <span>User</span>
                <span>Token</span>
                <span>Plan</span>
                <span>Status</span>
                <span className="text-right">Actions</span>
              </div>
              {users.map((user, idx) => (
                <div key={user.id} className="grid grid-cols-[2rem_1fr_2fr_1fr_1fr_6rem] gap-4 px-5 py-4 items-center hover:bg-muted/20 transition-colors">
                  <span className="text-sm text-muted-foreground">{idx + 1}</span>
                  <span className="font-medium text-sm truncate">{user.username}</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="font-mono text-xs text-muted-foreground truncate flex-1">{user.token ?? "—"}</code>
                  </div>
                  <span>
                    <Badge variant="outline" className="uppercase text-[10px] tracking-wider">{user.plan}</Badge>
                  </span>
                  <span>
                    <Badge variant={user.status === "active" ? "default" : "destructive"} className={user.status === "active" ? "bg-green-500/15 text-green-500 border-green-500/30 text-[10px]" : "text-[10px]"}>
                      ● {user.status}
                    </Badge>
                  </span>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7"
                      title="Copy token"
                      onClick={() => user.token && copyToken(user.token, user.id)}
                    >
                      {copiedId === user.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-7 h-7" title="Rotate token">
                          <RotateCw className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rotate Token for {user.username}?</AlertDialogTitle>
                          <AlertDialogDescription>The old token will be immediately invalidated. The user's application will need to be updated.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => rotateMutation.mutate({ id: user.id }, { onSuccess: () => { invalidate(); toast({ variant: "success", title: "Token rotated" }); }, onError: (e: any) => toast({ variant: "destructive", title: "Failed", description: e?.data?.error }) })}>Rotate</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-7 h-7 hover:text-destructive hover:bg-destructive/10" title="Delete user">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {user.username}?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently delete the user and revoke their token. This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate({ id: user.id }, { onSuccess: () => { invalidate(); toast({ variant: "success", title: "User deleted" }); }, onError: (e: any) => toast({ variant: "destructive", title: "Failed", description: e?.data?.error }) })}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              <KeyRound className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No users yet</p>
              <p className="text-sm mt-1">Create users in the Users page to see their tokens here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
