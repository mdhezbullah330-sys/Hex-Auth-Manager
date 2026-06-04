import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useVerifyEmail } from "@workspace/api-client-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Terminal, X } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [fetchingDevCode, setFetchingDevCode] = useState(false);

  const verifyMutation = useVerifyEmail();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
    } else {
      setLocation("/login");
    }
  }, [setLocation]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleVerify = () => {
    if (code.length !== 6) return;
    verifyMutation.mutate(
      { data: { email, code } },
      {
        onSuccess: (res) => {
          if (res.ok) {
            toast({ variant: "success", title: "Email verified", description: "Your account is now active. Please sign in." });
            setLocation("/login");
          } else {
            toast({ variant: "destructive", title: "Verification failed", description: res.message || "Invalid code." });
          }
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Verification failed", description: err?.data?.error || err?.message || "An error occurred." });
        },
      }
    );
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setDevCode(null);
    try {
      const res = await fetch(`${BASE}/api/auth/resend-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ variant: "success", title: "Code resent", description: "Check your email for the new code." });
        setResendCooldown(30);
        setCode("");
      } else {
        toast({ variant: "destructive", title: "Failed to resend", description: data.error || "Try again." });
      }
    } catch {
      toast({ variant: "destructive", title: "Failed to resend", description: "Network error." });
    } finally {
      setResending(false);
    }
  };

  const handleShowDevCode = async () => {
    setFetchingDevCode(true);
    try {
      const res = await fetch(`${BASE}/api/auth/dev-code?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (res.ok && data.code) {
        setDevCode(data.code);
        setCode(data.code);
      } else {
        toast({ variant: "destructive", title: "Could not fetch code", description: data.error || "No pending code found." });
      }
    } catch {
      toast({ variant: "destructive", title: "Network error", description: "Could not reach server." });
    } finally {
      setFetchingDevCode(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <Card className="border-border bg-card/80 backdrop-blur-sm shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">Verify Email</CardTitle>
            <CardDescription className="text-muted-foreground">
              We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>

            {/* Dev code fallback box */}
            {devCode && (
              <div className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/8">
                <div className="flex items-center gap-2.5">
                  <Terminal className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs text-amber-400/70 font-medium">Dev mode — verification code</p>
                    <p className="text-xl font-mono font-bold tracking-widest text-amber-300">{devCode}</p>
                  </div>
                </div>
                <button onClick={() => setDevCode(null)} className="text-amber-400/50 hover:text-amber-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <Button
              className="w-full font-semibold"
              onClick={handleVerify}
              disabled={code.length !== 6 || verifyMutation.isPending}
            >
              {verifyMutation.isPending ? "Verifying..." : "Verify Account"}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-3 border-t border-border/50 pt-6">
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
              className="text-sm text-primary hover:underline font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline transition-opacity"
            >
              {resending
                ? "Sending..."
                : resendCooldown > 0
                ? `Resend code (${resendCooldown}s)`
                : "Resend code"}
            </button>

            {/* Dev fallback — only visible in non-production */}
            {import.meta.env.DEV && (
              <button
                onClick={handleShowDevCode}
                disabled={fetchingDevCode}
                className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Terminal className="w-3 h-3" />
                {fetchingDevCode ? "Fetching..." : "Email not received? Show code directly"}
              </button>
            )}

            <p className="text-sm text-muted-foreground">
              Wrong email?{" "}
              <Link href="/login">
                <span className="text-primary hover:underline font-medium cursor-pointer">Return to login</span>
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
