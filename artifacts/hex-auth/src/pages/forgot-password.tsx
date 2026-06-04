import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ArrowLeft, CheckCircle2, Mail, KeyRound, Eye, EyeOff, RefreshCw, Terminal, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Step = "email" | "reset" | "done";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [fetchingDevCode, setFetchingDevCode] = useState(false);

  const handleShowDevCode = async () => {
    setFetchingDevCode(true);
    try {
      const res = await fetch(`/api/auth/dev-code?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (res.ok && data.resetCode) {
        setDevCode(data.resetCode);
        setCode(data.resetCode);
      } else {
        setError("No pending reset code found. Try sending the code again.");
      }
    } catch {
      setError("Could not reach server.");
    } finally {
      setFetchingDevCode(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Please enter your email address"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to send reset code"); return; }
      toast({ variant: "success", title: "Code sent!", description: data.emailSent ? "Check your inbox for the reset code." : "Code generated (check server logs if email unavailable)." });
      setStep("reset");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ variant: "destructive", title: "Failed", description: data.error }); return; }
      toast({ variant: "success", title: "New code sent!", description: "Check your inbox for the new reset code." });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Network error. Try again." });
    } finally {
      setResending(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!code || code.length !== 6) { setError("Please enter the 6-digit code"); return; }
    if (!newPassword || newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to reset password"); return; }
      setStep("done");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <AnimatePresence mode="wait">
          {step === "email" && (
            <motion.div key="email" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <Card className="border-border bg-card/80 backdrop-blur-sm shadow-2xl">
                <CardHeader className="space-y-1 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-2">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-bold tracking-tight">Forgot Password</CardTitle>
                  <CardDescription>Enter your email and we'll send you a reset code.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSendCode} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Email Address</Label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError(""); }}
                        autoComplete="email"
                        autoFocus
                      />
                    </div>
                    {error && (
                      <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded-md px-2.5 py-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
                      </motion.p>
                    )}
                    <Button type="submit" className="w-full font-semibold" disabled={loading}>
                      {loading ? "Sending..." : "Send Reset Code"}
                    </Button>
                  </form>
                  <div className="mt-6 text-center">
                    <Link href="/login">
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                      </span>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "reset" && (
            <motion.div key="reset" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <Card className="border-border bg-card/80 backdrop-blur-sm shadow-2xl">
                <CardHeader className="space-y-1 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-2">
                    <KeyRound className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-bold tracking-tight">Enter Reset Code</CardTitle>
                  <CardDescription>
                    We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleReset} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Reset Code</Label>
                      <Input
                        placeholder="000000"
                        value={code}
                        onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                        maxLength={6}
                        className="text-center text-2xl font-mono tracking-[0.3em] h-14"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>New Password</Label>
                      <div className="relative">
                        <Input
                          type={showPass ? "text" : "password"}
                          placeholder="At least 6 characters"
                          value={newPassword}
                          onChange={e => { setNewPassword(e.target.value); setError(""); }}
                          autoComplete="new-password"
                          className="pr-10"
                        />
                        <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          type={showConfirm ? "text" : "password"}
                          placeholder="Repeat your new password"
                          value={confirmPassword}
                          onChange={e => { setConfirmPassword(e.target.value); setError(""); }}
                          autoComplete="new-password"
                          className="pr-10"
                        />
                        <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                      )}
                    </div>
                    {error && (
                      <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded-md px-2.5 py-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
                      </motion.p>
                    )}
                    <Button type="submit" className="w-full font-semibold" disabled={loading}>
                      {loading ? "Resetting..." : "Reset Password"}
                    </Button>
                  </form>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <button onClick={() => { setStep("email"); setError(""); }} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                      <ArrowLeft className="w-3.5 h-3.5" /> Change email
                    </button>
                    <button onClick={handleResend} disabled={resending} className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1 disabled:opacity-50">
                      <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                      {resending ? "Sending..." : "Resend code"}
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
              <Card className="border-border bg-card/80 backdrop-blur-sm shadow-2xl">
                <CardContent className="pt-8 pb-8 text-center space-y-4">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1, stiffness: 200 }} className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </motion.div>
                  <h2 className="text-2xl font-bold">Password Reset!</h2>
                  <p className="text-muted-foreground">Your password has been updated successfully. You can now sign in with your new password.</p>
                  <Button className="w-full font-semibold mt-2" onClick={() => setLocation("/login")}>
                    Sign In
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
