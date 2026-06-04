import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Plus, Minus, MessageSquare, Crown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const DISCORD = "https://discord.gg/TKdd5GNhxq";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    desc: "Perfect for getting started.",
    features: ["50 Users", "Basic HWID Lock", "License Keys", "Community Support"],
    cta: "Current Plan",
    highlight: false,
    custom: false,
  },
  {
    name: "Starter",
    price: "$3",
    period: "/mo",
    desc: "For growing applications.",
    features: ["500 Users", "Advanced Security", "Discord Webhooks", "Event Logs", "Priority Support"],
    cta: "Get Starter",
    highlight: true,
    badge: "Most Popular",
    custom: false,
  },
  {
    name: "Pro",
    price: "$10",
    period: "/mo",
    desc: "For serious developers.",
    features: ["Unlimited Users", "White-label APIs", "Team Members", "Custom Variables", "24/7 Support"],
    cta: "Get Pro",
    highlight: false,
    custom: false,
  },
  {
    name: "Custom",
    price: "Contact",
    period: "",
    desc: "Enterprise & custom needs.",
    features: ["Custom Limits", "Dedicated Support", "SLA Guarantee", "Custom Integrations"],
    cta: "Contact Us",
    highlight: false,
    custom: true,
  },
];

const FAQ_ITEMS = [
  {
    q: "How do I pay for a plan?",
    a: "Send the plan price to our bKash or Nagad number (01755334082), then open a ticket on our Discord server with your payment screenshot and account email. We'll activate your plan within a few hours.",
  },
  {
    q: "When will my plan be activated?",
    a: "Plans are activated manually after payment confirmation. Typically within 1-4 hours during business hours. Join our Discord to check status.",
  },
  {
    q: "Can I upgrade or downgrade my plan?",
    a: "Yes. To upgrade, pay the difference and contact support. To downgrade, just let us know on Discord before your next billing cycle.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept bKash and Nagad (both at 01755334082). For international payments, contact us on Discord to arrange an alternative.",
  },
  {
    q: "Is there a refund policy?",
    a: "We offer refunds within 48 hours of purchase if you haven't used the plan features. Contact support on Discord.",
  },
  {
    q: "What is the Custom plan?",
    a: "Custom plans are for teams or businesses with specific requirements — higher user limits, dedicated infrastructure, or custom features. Contact us on Discord to discuss.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card/40">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/20 transition-colors"
      >
        <span className="font-semibold text-sm pr-4">{q}</span>
        <span className="shrink-0 w-6 h-6 rounded-full border border-border flex items-center justify-center text-muted-foreground">
          {open ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function UpgradePlanPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const currentPlan = user?.plan || "free";

  return (
    <div className="space-y-10 max-w-5xl">
      {/* Header */}
      <div>
        <button onClick={() => setLocation("/settings?tab=plan")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Settings
        </button>
        <h1 className="text-3xl font-black tracking-tight">Upgrade Plan</h1>
        <p className="text-muted-foreground mt-1">Unlock more power for your applications.</p>
      </div>

      {/* Current plan banner */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5">
        <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
          <Crown className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="font-semibold">You're on the <span className="text-primary uppercase">{currentPlan}</span> plan.</p>
          <p className="text-xs text-muted-foreground">
            {currentPlan === "free"
              ? "Upgrade to unlock more users, features, and support."
              : "Thank you for supporting Hex Auth! Your plan is active."}
          </p>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan, i) => {
          const isCurrent = plan.name.toLowerCase() === currentPlan;
          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                plan.highlight
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : isCurrent
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-card/40"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-full whitespace-nowrap">
                  {plan.badge}
                </div>
              )}
              {isCurrent && !plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-widest rounded-full whitespace-nowrap border border-border">
                  Current Plan
                </div>
              )}
              <div className="mb-4">
                <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${plan.highlight ? "text-primary" : "text-muted-foreground"}`}>{plan.name}</p>
                <div className="flex items-end gap-0.5">
                  <span className="text-3xl font-black">{plan.price}</span>
                  {plan.period && <span className="text-sm text-muted-foreground mb-1">{plan.period}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{plan.desc}</p>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <Button variant="outline" disabled className="w-full text-xs">Current Plan</Button>
              ) : plan.custom ? (
                <a href={DISCORD} target="_blank" rel="noopener noreferrer" className="block">
                  <Button variant="outline" className="w-full gap-1 text-xs">
                    <MessageSquare className="w-3.5 h-3.5" /> {plan.cta}
                  </Button>
                </a>
              ) : (
                <a href={DISCORD} target="_blank" rel="noopener noreferrer" className="block">
                  <Button className={`w-full text-xs font-semibold ${plan.highlight ? "" : ""}`} variant={plan.highlight ? "default" : "outline"}>
                    {plan.cta}
                  </Button>
                </a>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Payment section */}
      <div className="rounded-2xl border border-border bg-card/40 p-6">
        <h2 className="font-bold text-lg mb-1">Payment Methods</h2>
        <p className="text-sm text-muted-foreground mb-6">Send payment to one of the methods below, then open a ticket on Discord to activate your plan.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col items-center justify-center p-5 rounded-xl border border-border bg-background/60 text-center">
            <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">bKash</p>
            <p className="text-2xl font-mono font-black">01755334082</p>
          </div>
          <div className="flex flex-col items-center justify-center p-5 rounded-xl border border-border bg-background/60 text-center">
            <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">Nagad</p>
            <p className="text-2xl font-mono font-black">01755334082</p>
          </div>
          <a href={DISCORD} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-5 rounded-xl border border-[#5865F2]/50 bg-[#5865F2]/10 hover:bg-[#5865F2]/15 transition-colors text-center cursor-pointer">
            <svg className="w-7 h-7 text-[#7983f5] mb-2" viewBox="0 0 127.14 96.36" fill="currentColor">
              <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z" />
            </svg>
            <p className="text-xs uppercase tracking-widest font-bold text-[#7983f5] mb-1">Discord</p>
            <p className="font-bold text-sm text-[#7983f5]">Create Ticket</p>
          </a>
        </div>
        <p className="mt-4 text-xs text-muted-foreground text-center">After sending payment, create a support ticket on Discord with your payment receipt and email address.</p>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="font-bold text-xl mb-4">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </div>
  );
}
