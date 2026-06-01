import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useVerifyEmail } from "@workspace/api-client-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const verifyMutation = useVerifyEmail();

  const fetchDevCode = useCallback((emailVal: string) => {
    fetch(`${BASE}/api/auth/dev-code?email=${encodeURIComponent(emailVal)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && !data.verified && data.code) {
          setDevCode(data.code);
          setDevMode(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
      fetchDevCode(emailParam);
    } else {
      setLocation("/login");
    }
  }, [setLocation, fetchDevCode]);

  // Countdown timer
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
            toast({ title: "Email verified", description: "Your account is now active. Please sign in." });
            setLocation("/login");
          } else {
            toast({ variant: "destructive", title: "Verification failed", description: res.message || "Invalid code." });
          }
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Verification failed", description: err.error || "An error occurred." });
        },
      }
    );
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      const res = await fetch(`${BASE}/api/auth/resend-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Code resent", description: "Check your email for the new code." });
        setResendCooldown(30);
        setCode("");
        // Refresh dev code if in dev mode
        setTimeout(() => fetchDevCode(email), 500);
      } else {
        toast({ variant: "destructive", title: "Failed to resend", description: data.error || "Try again." });
      }
    } catch {
      toast({ variant: "destructive", title: "Failed to resend", description: "Network error." });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Dev mode banner */}
        {devMode && devCode && (
          <div className="mb-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4">
            <div className="flex items-start gap-3">
              <span className="text-yellow-400 text-lg">⚠️</span>
              <div className="w-full">
                <p className="text-yellow-300 text-sm font-semibold mb-1">Development Mode — SMTP not configured</p>
                <p className="text-yellow-200/70 text-xs mb-3">
                  Email was not sent. Your verification code is shown below.
                </p>
                <button
                  onClick={() => setCode(devCode)}
                  className="flex items-center gap-3 w-full bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 rounded-lg px-4 py-3 transition-all group"
                >
                  <span className="font-mono text-2xl font-bold tracking-[0.3em] text-yellow-300">
                    {devCode}
                  </span>
                  <span className="ml-auto text-xs text-yellow-400/70 group-hover:text-yellow-300 transition-colors">
                    click to fill →
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        <Card className="border-border bg-card/80 backdrop-blur-sm shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">Verify Email</CardTitle>
            <CardDescription className="text-muted-foreground">
              {devMode
                ? "Click the code above to auto-fill, or type it manually"
                : <>We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span></>
              }
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
            <p className="text-sm text-muted-foreground">
              Didn't receive a code?{" "}
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
