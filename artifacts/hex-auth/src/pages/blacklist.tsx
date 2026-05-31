import React, { useState } from "react";
import { 
  useGetBlacklist, getGetBlacklistQueryKey,
  useAddBlacklist,
  useRemoveBlacklist
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ShieldBan } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function BlacklistPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: blacklist, isLoading } = useGetBlacklist({ query: { queryKey: getGetBlacklistQueryKey() } });
  
  const addMutation = useAddBlacklist();
  const removeMutation = useRemoveBlacklist();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [type, setType] = useState("ip");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");

  const handleAdd = () => {
    addMutation.mutate(
      { data: { type, value, reason: reason || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetBlacklistQueryKey() });
          toast({ title: "Entry added to blacklist" });
          setIsAddOpen(false);
          setValue("");
          setReason("");
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Failed to add", description: err.error });
        }
      }
    );
  };

  const handleRemove = (id: number) => {
    removeMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetBlacklistQueryKey() });
          toast({ title: "Entry removed from blacklist" });
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Failed to remove", description: err.error });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Blacklist</h1>
          <p className="text-muted-foreground">Block specific IP addresses, HWIDs, or usernames globally.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" variant="destructive">
              <ShieldBan className="w-4 h-4" /> Block Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to Blacklist</DialogTitle>
              <DialogDescription>Block an identifier from accessing any of your applications.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ip">IP Address</SelectItem>
                    <SelectItem value="hwid">Hardware ID</SelectItem>
                    <SelectItem value="username">Username</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input placeholder={type === 'ip' ? '192.168.1.1' : type === 'hwid' ? 'A1B2C3D4E5F6' : 'hacker123'} value={value} onChange={(e) => setValue(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Reason (Optional)</Label>
                <Input placeholder="Suspicious activity" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleAdd} disabled={!value || addMutation.isPending}>
                {addMutation.isPending ? "Adding..." : "Block Entry"}
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
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1,2,3].map(i => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-10 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : blacklist && blacklist.length > 0 ? (
                blacklist.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-[10px] tracking-wider">{entry.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{entry.value}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{entry.reason || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemove(entry.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No blacklisted entries.
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