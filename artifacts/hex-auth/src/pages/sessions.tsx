import React from "react";
import { 
  useGetSessions, getGetSessionsQueryKey,
  useKillSession
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { XCircle, Monitor, Globe } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function SessionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: sessions, isLoading } = useGetSessions({ query: { queryKey: getGetSessionsQueryKey() } });
  const killSessionMutation = useKillSession();

  const handleKillSession = (id: number) => {
    killSessionMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSessionsQueryKey() });
          toast({ title: "Session terminated" });
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Failed to terminate", description: err.error });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Active Sessions</h1>
          <p className="text-muted-foreground">Monitor and control live user connections.</p>
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>HWID</TableHead>
                <TableHead>App ID</TableHead>
                <TableHead>Connected At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1,2,3].map(i => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : sessions && sessions.length > 0 ? (
                sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.username}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm font-mono">
                        <Globe className="w-3 h-3" />
                        {session.ipAddress}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm font-mono">
                        <Monitor className="w-3 h-3" />
                        {session.hwid ? session.hwid.substring(0, 16) + "..." : '—'}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{session.appId || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(session.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive">
                            <XCircle className="w-4 h-4 mr-1.5" /> Kill Session
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Terminate Session?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will instantly force the user to re-authenticate. Unsaved progress may be lost.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleKillSession(session.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                              Kill Session
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No active sessions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}