import React, { useState } from "react";
import { 
  useGetDashboardStats, getGetDashboardStatsQueryKey,
  useGetRecentActivity, getGetRecentActivityQueryKey,
  useGetActiveUsersChart, getGetActiveUsersChartQueryKey,
  useGetPlanMix, getGetPlanMixQueryKey,
  useGetSessions, getGetSessionsQueryKey
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, Key, DollarSign } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<"24h" | "7d" | "30d" | "all">("7d");
  
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey() } });
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({ limit: 5 }, { query: { queryKey: getGetRecentActivityQueryKey({ limit: 5 }) } });
  const { data: chartData, isLoading: chartLoading } = useGetActiveUsersChart({ period }, { query: { queryKey: getGetActiveUsersChartQueryKey({ period }) } });
  const { data: planMix, isLoading: mixLoading } = useGetPlanMix({ query: { queryKey: getGetPlanMixQueryKey() } });
  const { data: sessions, isLoading: sessionsLoading } = useGetSessions({ query: { queryKey: getGetSessionsQueryKey() } });

  const activeSessions = sessions?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Welcome back, {user?.username}</h1>
        <p className="text-muted-foreground">Here's what's happening with your protected applications.</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Users" value={stats?.activeUsers} icon={Users} loading={statsLoading} />
        <StatCard title="Live Sessions" value={stats?.liveSessions} icon={Activity} loading={statsLoading} valueClass="text-primary" />
        <StatCard title="Keys Redeemed" value={stats?.keysRedeemed} subtitle={`Out of ${stats?.totalKeys || 0} total`} icon={Key} loading={statsLoading} />
        <StatCard title="MRR" value={`$${stats?.mrr || 0}`} icon={DollarSign} loading={statsLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="col-span-1 lg:col-span-2 border-border bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Active Users</CardTitle>
              <CardDescription>Unique users authenticated over time</CardDescription>
            </div>
            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              {chartLoading ? (
                <Skeleton className="w-full h-full rounded-md" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plan Mix */}
        <Card className="col-span-1 border-border bg-card/50">
          <CardHeader>
            <CardTitle>Plan Mix</CardTitle>
            <CardDescription>Distribution of users by plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              {mixLoading ? (
                <Skeleton className="w-full h-full rounded-md" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planMix || []} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="plan" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {(planMix || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--primary))' : index === 1 ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-3))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {(planMix || []).map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-muted-foreground">{p.plan}</span>
                  <span className="font-medium">{p.percentage}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="space-y-4">
                {activity.map((log) => (
                  <div key={log.id} className="flex items-start gap-4">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      log.severity === 'error' ? 'bg-destructive' : 
                      log.severity === 'warn' ? 'bg-orange-500' : 'bg-primary'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{log.description}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{log.username || 'System'}</span>
                        <span>•</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No recent activity</div>
            )}
          </CardContent>
        </Card>

        {/* Top Sessions */}
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Top Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="space-y-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : activeSessions.length > 0 ? (
              <div className="space-y-4">
                {activeSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                    <div>
                      <p className="text-sm font-medium">{session.username}</p>
                      <p className="text-xs text-muted-foreground font-mono">{session.ipAddress}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        Live
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No active sessions</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, loading, valueClass = "" }: any) {
  return (
    <Card className="border-border bg-card/50 hover:border-border/80 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className="w-4 h-4 text-muted-foreground/70" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <span className={`text-3xl font-bold tracking-tight ${valueClass}`}>{value !== undefined ? value : "-"}</span>
          )}
        </div>
        {subtitle && !loading && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
