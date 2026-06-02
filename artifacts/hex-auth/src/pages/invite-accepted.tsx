import React from "react";
import { Link, useSearch } from "wouter";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react";

export default function InviteAcceptedPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const ok = params.get("ok") === "1";
  const error = params.get("error");

  const content = ok
    ? {
        icon: <CheckCircle2 className="w-16 h-16 text-emerald-500" />,
        title: "Invitation Accepted!",
        description: "You've successfully joined the team. Sign in to your Hex Auth account to get started.",
        action: { href: "/login", label: "Sign In to Dashboard" },
        color: "text-emerald-500",
        border: "border-emerald-500/20",
        bg: "bg-emerald-500/5",
      }
    : error === "expired"
    ? {
        icon: <Clock className="w-16 h-16 text-yellow-500" />,
        title: "Invitation Expired",
        description: "This invitation link has expired (links are valid for 48 hours). Please ask the team owner to send a new invite.",
        action: { href: "/login", label: "Go to Sign In" },
        color: "text-yellow-500",
        border: "border-yellow-500/20",
        bg: "bg-yellow-500/5",
      }
    : {
        icon: <XCircle className="w-16 h-16 text-destructive" />,
        title: "Invalid Invitation",
        description: "This invitation link is invalid or has already been used. Please ask the team owner for a new invite.",
        action: { href: "/login", label: "Go to Sign In" },
        color: "text-destructive",
        border: "border-destructive/20",
        bg: "bg-destructive/5",
      };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <div className={`rounded-2xl border ${content.border} ${content.bg} backdrop-blur-sm p-8 text-center shadow-2xl`}>
          <div className="flex justify-center mb-5">
            {content.icon}
          </div>
          <h1 className={`text-2xl font-bold tracking-tight mb-3 ${content.color}`}>
            {content.title}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            {content.description}
          </p>
          <Link href={content.action.href}>
            <Button className="w-full gap-2 font-semibold">
              {content.action.label} <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          {!ok && (
            <p className="mt-4 text-xs text-muted-foreground">
              Don't have an account yet?{" "}
              <Link href="/register">
                <span className="text-primary hover:underline cursor-pointer">Register here</span>
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
