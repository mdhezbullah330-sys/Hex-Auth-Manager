import React from "react";
import { useLocation } from "wouter";
import { useGetMyTeams, getGetMyTeamsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Shield, Eye, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function SelectProjectPage() {
  const { user, selectProject } = useAuth();
  const [, setLocation] = useLocation();
  const { data: teams, isLoading } = useGetMyTeams({ query: { queryKey: getGetMyTeamsQueryKey() } });

  const handleSelectOwn = () => {
    selectProject(null);
    setLocation("/dashboard");
  };

  const handleSelectTeam = (ownerId: string, ownerUsername: string) => {
    selectProject({ ownerId, ownerUsername });
    setLocation("/dashboard");
  };

  const roleIcon = (role: string) => {
    if (role === "admin") return <Shield className="w-4 h-4 text-blue-400" />;
    return <Eye className="w-4 h-4 text-muted-foreground" />;
  };

  const roleBadge = (role: string) => {
    if (role === "admin") return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">Admin</Badge>;
    return <Badge variant="outline" className="text-[10px]">Viewer</Badge>;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Select a Project</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Choose which workspace you want to continue with.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
                onClick={handleSelectOwn}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{user?.username}'s Workspace</p>
                    <p className="text-xs text-muted-foreground">Your personal workspace</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Owner</Badge>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </motion.button>

              {teams && teams.map((team, i) => (
                <motion.button
                  key={team.ownerId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (i + 1) * 0.05 }}
                  onClick={() => handleSelectTeam(team.ownerId, team.ownerUsername)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 bg-card/50 hover:bg-muted/30 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      {roleIcon(team.role)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{team.ownerUsername}'s Workspace</p>
                      <p className="text-xs text-muted-foreground">{team.ownerEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {roleBadge(team.role)}
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
