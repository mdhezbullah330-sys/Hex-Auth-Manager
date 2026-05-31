import React, { useState } from "react";
import { 
  useGetApps, getGetAppsQueryKey,
  useCreateApp,
  useDeleteApp,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Settings2, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

export default function AppsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: apps, isLoading } = useGetApps({ query: { queryKey: getGetAppsQueryKey() } });
  
  const createAppMutation = useCreateApp();
  const deleteAppMutation = useDeleteApp();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [newAppVersion, setNewAppVersion] = useState("1.0.0");

  const handleCreate = () => {
    createAppMutation.mutate(
      { data: { name: newAppName, version: newAppVersion } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAppsQueryKey() });
          toast({ title: "App created successfully" });
          setIsCreateOpen(false);
          setNewAppName("");
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Failed to create app", description: err.error });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteAppMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAppsQueryKey() });
          toast({ title: "App deleted" });
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Failed to delete app", description: err.error });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
          <p className="text-muted-foreground">Manage your software products and versions.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Create App
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
              <Button onClick={handleCreate} disabled={!newAppName || createAppMutation.isPending}>
                {createAppMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>App Name</TableHead>
                <TableHead>App ID</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Users</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1,2,3].map(i => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : apps && apps.length > 0 ? (
                apps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{app.appId}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{app.version}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={app.status === 'active' ? 'default' : 'secondary'} className={app.status === 'active' ? 'bg-primary/20 text-primary border-primary/30' : ''}>
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{app.userCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/api-tokens`}>
                          <Button variant="ghost" size="icon" title="API Settings">
                            <Settings2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </Link>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {app.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. All users, licenses, and sessions associated with this app will be permanently deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(app.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                Delete App
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No applications found. Create one to get started.
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
