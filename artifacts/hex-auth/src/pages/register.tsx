import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister } from "@workspace/api-client-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { AnimatedInput } from "@/components/ui/animated-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const registerMutation = useRegister();

  const { register, handleSubmit, control, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const passwordValue = useWatch({ control, name: "password", defaultValue: "" });
  const confirmValue = useWatch({ control, name: "confirmPassword", defaultValue: "" });

  const matchState: "idle" | "match" | "mismatch" =
    confirmValue.length === 0 ? "idle"
    : confirmValue.length > 0 && passwordValue.startsWith(confirmValue.slice(0, passwordValue.length)) && passwordValue === confirmValue ? "match"
    : confirmValue.length > 0 && !passwordValue.startsWith(confirmValue) ? "mismatch"
    : "idle";

  const confirmBorderClass =
    matchState === "match" ? "border-emerald-500 focus-visible:ring-emerald-500/50 bg-emerald-500/5"
    : matchState === "mismatch" ? "border-red-500 focus-visible:ring-red-500/50 bg-red-500/5"
    : errors.confirmPassword ? "border-destructive" : "";

  const onSubmit = (data: RegisterForm) => {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(
      { data: registerData },
      {
        onSuccess: (res) => {
          if (res.ok) {
            toast({ variant: "success", title: "Account created", description: "Please verify your email address to continue." });
            setLocation(`/verify-email?email=${encodeURIComponent(data.email)}`);
          } else {
            toast({ variant: "destructive", title: "Registration failed", description: res.message || "Could not create account." });
          }
        },
        onError: (err: any) => {
          const msg = err?.data?.error || err?.message || "An error occurred.";
          const isUnverified = err?.data?.code === "UNVERIFIED";
          if (isUnverified) {
            toast({ variant: "destructive", title: "Already registered", description: msg,
              action: { label: "Verify now", onClick: () => setLocation(`/verify-email?email=${encodeURIComponent(err.data.email)}`) } as any });
          } else {
            toast({ variant: "destructive", title: "Registration failed", description: msg });
          }
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
            <CardTitle className="text-2xl font-bold tracking-tight">Create Free Account</CardTitle>
            <CardDescription className="text-muted-foreground">
              Join Hex Auth and start protecting your software
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <AnimatedInput
                  id="username"
                  typedPlaceholder="developer123"
                  {...register("username")}
                  className={errors.username ? "border-destructive" : ""}
                />
                {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <AnimatedInput
                  id="email"
                  type="email"
                  typedPlaceholder="you@example.com"
                  {...register("email")}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <AnimatedInput
                  id="password"
                  type="password"
                  typedPlaceholder="••••••••"
                  {...register("password")}
                  className={errors.password ? "border-destructive" : ""}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password
                  {matchState === "match" && <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-500 font-medium"><CheckCircle2 className="w-3 h-3" />Passwords match</span>}
                  {matchState === "mismatch" && <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-500 font-medium"><XCircle className="w-3 h-3" />Does not match</span>}
                </Label>
                <AnimatedInput
                  id="confirmPassword"
                  type="password"
                  typedPlaceholder="••••••••"
                  {...register("confirmPassword")}
                  className={cn("transition-colors", confirmBorderClass)}
                />
                {errors.confirmPassword && matchState === "idle" && (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
              
              <Button type="submit" className="w-full font-semibold" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/50 pt-6">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login">
                <span className="text-primary hover:underline font-medium cursor-pointer">Sign in</span>
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
