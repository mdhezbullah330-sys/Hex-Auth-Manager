import React from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { AnimatedInput } from "@/components/ui/animated-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  identifier: z.string().min(1, "Username or Email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

function FieldError({ message }: { message?: string }) {
  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <p className="flex items-center gap-1.5 text-xs text-destructive mt-1 bg-destructive/8 border border-destructive/20 rounded-md px-2.5 py-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {message}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const loginMutation = useLogin();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: async (res) => {
          if (res.ok && res.token && res.user) {
            login(res.token, res.user);
            toast({ variant: "success", title: "Welcome back!", description: "Successfully signed in." });
            // Check if user belongs to any teams — if so, show project selector
            try {
              const teamsRes = await fetch("/api/auth/my-teams", {
                headers: { Authorization: `Bearer ${res.token}` },
              });
              if (teamsRes.ok) {
                const teams = await teamsRes.json();
                if (Array.isArray(teams) && teams.length > 0) {
                  setLocation("/select-project");
                  return;
                }
              }
            } catch {
              // Ignore — just go to dashboard
            }
            setLocation("/dashboard");
          } else {
            toast({ variant: "destructive", title: "Login failed", description: res.message || "Invalid credentials." });
          }
        },
        onError: (err: any) => {
          const errData = err?.data ?? err?.response?.data;
          // Unverified account — backend auto-resent the code, redirect to verify page
          if (errData?.requiresVerification && errData?.email) {
            toast({
              title: "Email verification required",
              description: "A verification code has been sent to your email.",
            });
            setLocation(`/verify-email?email=${encodeURIComponent(errData.email)}`);
            return;
          }
          const msg = errData?.message || errData?.error || err?.message || "An error occurred.";
          toast({ variant: "destructive", title: "Login failed", description: msg });
        }
      }
    );
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
            <CardTitle className="text-2xl font-bold tracking-tight">Sign In</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your credentials to access the control room
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="identifier">Username or Email</Label>
                <AnimatedInput
                  id="identifier"
                  typedPlaceholder="Enter your username or email"
                  {...register("identifier")}
                  className={errors.identifier ? "border-destructive focus-visible:ring-destructive/30" : ""}
                  autoComplete="username"
                />
                <FieldError message={errors.identifier?.message} />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <AnimatedInput
                  id="password"
                  type="password"
                  typedPlaceholder="Enter your password"
                  {...register("password")}
                  className={errors.password ? "border-destructive focus-visible:ring-destructive/30" : ""}
                  autoComplete="current-password"
                />
                <FieldError message={errors.password?.message} />
              </div>
              
              <Button type="submit" className="w-full font-semibold" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Authenticating..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/50 pt-6">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register">
                <span className="text-primary hover:underline font-medium cursor-pointer">Create one</span>
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
