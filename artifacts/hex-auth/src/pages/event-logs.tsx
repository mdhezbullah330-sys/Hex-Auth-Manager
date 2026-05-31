import React, { useState } from "react";
import { 
  useGetLogs, getGetLogsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, AlertCircle, Info, CheckCircle2, ShieldAlert } from "lucide-react";

export default function EventLogsPage() {
  const [filter, setFilter] = useState<"all" | "good" | "bad" | "warn" | "info">("all");
  
  const { data: logs, isLoading } = useGetLogs(
    { filter: filter === "all" ? undefined : filter, limit: 100 }, 
    { query: { queryKey: getGetLogsQueryKey({ filter: filter === "all" ? undefined : filter, limit: 100 }) } }
  );

  const getSeverityIcon = (severity?: string) => {
    switch(severity) {
      case 'error': return <ShieldAlert className="w-4 h-4 text-destructive" />;
      case 'warn': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      case 'success':
      default: return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('fail') || action.includes('deny') || action.includes('ban')) return 'bg-destructive/10 text-destructive border-destructive/20';
    if (action.includes('reset') || action.includes('warn')) return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    if (action.includes('ok') || action.includes('success')) return 'bg-green-500/10 text-green-500 border-green-500/20';
    return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Event Logs</h1>
          <p className="text-muted-foreground">Audit trail of all authentication and admin activities.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <Tabs defaultValue="all" value={filter} onValueChange={(v: any) => setFilter(v)} className="w-full">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="all">All Events</TabsTrigger>
          <TabsTrigger value="good">Successful</TabsTrigger>
          <TabsTrigger value="bad">Failed/Denied</TabsTrigger>
          <TabsTrigger value="warn">Warnings</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="border-border">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {isLoading ? (
              [1,2,3,4,5].map(i => (
                <div key={i} className="p-4 flex gap-4">
                  <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))
            ) : logs && logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className="p-4 flex gap-4 hover:bg-muted/30 transition-colors">
                  <div className="mt-1 shrink-0 bg-background border border-border rounded-full p-2">
                    {getSeverityIcon(log.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{log.description}</span>
                      <Badge variant="outline" className={`text-[10px] uppercase font-mono tracking-wider ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium text-foreground/80">
                        {log.username || 'System'}
                      </span>
                      {log.ipAddress && (
                        <span className="font-mono">{log.ipAddress}</span>
                      )}
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No events found for this filter.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}