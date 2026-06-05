import React, { useState } from "react";
import { 
  useGetLicenses, getGetLicensesQueryKey,
  useGenerateLicense,
  useDeleteLicense,
  useRedeemLicense,
  useGetApps, getGetAppsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Key, Copy, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function LicensesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>(undefined);

  const { data: apps } = useGetApps({ query: { queryKey: getGetAppsQueryKey() } });
  const { data: licenses, isLoading } = useGetLicenses({ query: { queryKey: getGetLicensesQueryKey() } });
  
  const generateMutation = useGenerateLicense();
  const deleteMutation = useDeleteLicense();
  const redeemMutation = useRedeemLicense();

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [plan, setPlan] = useState("starter");
  const [quantity, setQuantity] = useState("1");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [redeemKey, setRedeemKey] = useState("");

  const handleGenerate = () => {
    generateMutation.mutate(
      { data: { plan, quantity: parseInt(quantity) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetLicensesQueryKey() });
          toast({ variant: "success", title: "Licenses generated successfully" });
          setIsGenerateOpen(false);
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Failed to generate", description: err?.data?.error || err?.message });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetLicensesQueryKey() });
          toast({ variant: "success", title: "License deleted" });
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Failed to delete", description: err?.data?.error || err?.message });
        }
      }
    );
  };

  const handleRedeem = () => {
    if (!redeemKey) return;
    redeemMutation.mutate(
      { data: { key: redeemKey } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetLicensesQueryKey() });
          toast({ variant: "success", title: "License redeemed successfully" });
          setRedeemKey("");
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Failed to redeem", description: err?.data?.error || err?.message });
        }
      }
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">License Keys</h1>
          <p className="text-muted-foreground">Generate and manage activation keys for your software.</p>
        </div>
        <div className="flex items-center gap-2">
          {apps && (apps as any[]).length > 1 ? (
            <Select value={selectedAppId ?? "all"} onValueChange={(v) => setSelectedAppId(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All apps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All apps</SelectItem>
                {(apps as any[]).map((a: any) => (
                  <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : apps && (apps as any[]).length === 1 ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 text-sm font-medium text-muted-foreground border border-border/50">
              {(apps as any[])[0].name}
            </div>
          ) : null}
          <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Generate Keys
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate License Keys</DialogTitle>
              <DialogDescription>Create new activation keys to distribute to your users.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Plan Tier</Label>
                <Select value={plan} onValueChange={setPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" min="1" max="100" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>Cancel</Button>
              <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? "Generating..." : "Generate"}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg">Redeem Code</CardTitle>
          <CardDescription>Manually redeem a key for a user.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 max-w-md">
            <Input placeholder="XXXX-XXXX-XXXX-XXXX" value={redeemKey} onChange={e => setRedeemKey(e.target.value)} className="font-mono" />
            <Button onClick={handleRedeem} disabled={!redeemKey || redeemMutation.isPending}>Redeem</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Used By</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1,2,3].map(i => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-10 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : licenses && licenses.length > 0 ? (
                licenses.map((license) => (
                  <TableRow key={license.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm tracking-widest">{license.key}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(license.key)}>
                          {copiedKey === license.key ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-[10px] tracking-wider">{license.plan}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={license.status === 'active' ? 'default' : 'secondary'} className={license.status === 'active' ? 'bg-green-500/20 text-green-500 border-green-500/30' : ''}>
                        {license.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {license.usedByUsername || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(license.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete License?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. Unused keys will be permanently deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(license.id)} className="bg-destructive hover:bg-destructive/90">Delete Key</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No licenses found. Generate some to get started.
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