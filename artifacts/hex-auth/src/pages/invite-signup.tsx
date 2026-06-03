import React from "react";
import { Link, useSearch } from "wouter";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, UserPlus } from "lucide-react";

export default function InviteSignupPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") ?? "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/10 via-background to-background pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 backdrop-blur-sm p-8 text-center shadow-2xl">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight mb-3 text-yellow-400">
            Oops! Please Sign Up First
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-2">
            You've been invited to join a team on Hex Auth, but you don't have an account yet.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            Create your account first, then click the invite link again to accept.
          </p>

          <div className="space-y-3">
            <Link href="/register">
              <Button className="w-full gap-2 font-semibold">
                <UserPlus className="w-4 h-4" /> Create Account
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full gap-2">
                Already have an account? Sign In <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {token && (
            <p className="mt-5 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
              After signing in or registering, use this invite link again:<br />
              <span className="text-primary font-mono text-[10px] break-all">
                /api/settings/team/accept/{token}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
