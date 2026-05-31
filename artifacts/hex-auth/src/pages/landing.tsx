import React, { useState } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useThreeCanvas } from "@/hooks/use-three-canvas";
import {
  Terminal, Shield, Zap, Lock, Database, Code2, Layers, Key,
  ArrowRight, Globe, Cpu, Server, FileCode, ChevronRight, Download
} from "lucide-react";
import logoImg from "@assets/hexauth_1780209078520.jpg";

const SDK_TABS = ["Python", "C#", "C++", "Java", "Node.js", "PHP"] as const;
type SdkTab = typeof SDK_TABS[number];

const SDK_DOWNLOAD_KEY: Record<SdkTab, string> = {
  "Python":  "python",
  "C#":      "csharp",
  "C++":     "cpp",
  "Java":    "java",
  "Node.js": "nodejs",
  "PHP":     "php",
};

const SDK_CODE: Record<SdkTab, { file: string; code: string }> = {
  Python: {
    file: "main.py",
    code: `from hexauth import HexAuth

api = HexAuth(
    app_id="YOUR_APP_ID",
    app_secret="YOUR_SECRET",
    version="1.0"
)

# Authenticate user with HWID lock
result = api.login(
    username="developer123",
    password="secure_password"
)

if result.ok:
    print(f"Welcome {result.user.username}!")
    print(f"Plan: {result.user.plan}")
    
    # Get a remote variable
    var = api.get_variable("download_url")
    print(f"Download: {var.value}")
else:
    print(f"Auth failed: {result.message}")`,
  },
  "C#": {
    file: "Program.cs",
    code: `using HexAuth;

var api = new HexAuth(
    appId: "YOUR_APP_ID",
    appSecret: "YOUR_SECRET",
    version: "1.0"
);

// Authenticate user with HWID lock
var result = await api.LoginAsync(
    username: "developer123",
    password: "secure_password"
);

if (result.Ok)
{
    Console.WriteLine($"Welcome {result.User.Username}!");
    Console.WriteLine($"Plan: {result.User.Plan}");
    
    // Get a remote variable
    var v = await api.GetVariableAsync("download_url");
    Console.WriteLine($"Download: {v.Value}");
}
else
{
    Console.WriteLine($"Auth failed: {result.Message}");
}`,
  },
  "C++": {
    file: "main.cpp",
    code: `#include "hexauth.h"
#include <iostream>

int main() {
    HexAuth api(
        "YOUR_APP_ID",
        "YOUR_SECRET",
        "1.0"
    );

    // Authenticate user with HWID lock
    auto result = api.login(
        "developer123",
        "secure_password"
    );

    if (result.ok) {
        std::cout << "Welcome "
                  << result.user.username << "!\n";
        std::cout << "Plan: "
                  << result.user.plan << "\n";

        auto var = api.getVariable("download_url");
        std::cout << "Download: " << var.value << "\n";
    } else {
        std::cout << "Auth failed: "
                  << result.message << "\n";
    }
    return 0;
}`,
  },
  Java: {
    file: "Main.java",
    code: `import io.hexauth.HexAuth;
import io.hexauth.LoginResult;

public class Main {
    public static void main(String[] args) {
        HexAuth api = new HexAuth(
            "YOUR_APP_ID",
            "YOUR_SECRET",
            "1.0"
        );

        // Authenticate user with HWID lock
        LoginResult result = api.login(
            "developer123",
            "secure_password"
        );

        if (result.isOk()) {
            System.out.println("Welcome "
                + result.getUser().getUsername());
            System.out.println("Plan: "
                + result.getUser().getPlan());

            var v = api.getVariable("download_url");
            System.out.println("Download: " + v.getValue());
        } else {
            System.out.println("Auth failed: "
                + result.getMessage());
        }
    }
}`,
  },
  "Node.js": {
    file: "index.js",
    code: `const { HexAuth } = require("hexauth");

const api = new HexAuth({
  appId: "YOUR_APP_ID",
  appSecret: "YOUR_SECRET",
  version: "1.0",
});

// Authenticate user with HWID lock
const result = await api.login({
  username: "developer123",
  password: "secure_password",
});

if (result.ok) {
  console.log(\`Welcome \${result.user.username}!\`);
  console.log(\`Plan: \${result.user.plan}\`);

  const v = await api.getVariable("download_url");
  console.log(\`Download: \${v.value}\`);
} else {
  console.log(\`Auth failed: \${result.message}\`);
}`,
  },
  PHP: {
    file: "index.php",
    code: `<?php
require_once 'hexauth.php';

$api = new HexAuth(
    app_id: 'YOUR_APP_ID',
    app_secret: 'YOUR_SECRET',
    version: '1.0'
);

// Authenticate user with HWID lock
$result = $api->login(
    username: 'developer123',
    password: 'secure_password'
);

if ($result->ok) {
    echo "Welcome " . $result->user->username . "!\n";
    echo "Plan: " . $result->user->plan . "\n";

    $var = $api->getVariable('download_url');
    echo "Download: " . $var->value . "\n";
} else {
    echo "Auth failed: " . $result->message . "\n";
}`,
  },
};

function FadeInSection({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SlideInCard({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const FEATURES = [
  { icon: Shield, title: "HWID Lock", desc: "Lock accounts to specific hardware devices. No more credential sharing." },
  { icon: Key, title: "License Keys", desc: "Generate, manage, and distribute secure HEX-XXXX product keys." },
  { icon: Zap, title: "Live Sessions", desc: "Monitor and terminate active user sessions in real time." },
  { icon: Lock, title: "Blacklist", desc: "Block IPs, HWIDs, or usernames globally with one click." },
  { icon: Database, title: "Variables", desc: "Store and serve encrypted remote variables to your running app." },
  { icon: Layers, title: "File Hosting", desc: "Host secure payload files directly from the dashboard." },
  { icon: Terminal, title: "Event Logs", desc: "Granular colour-coded audit trails of every action in your app." },
  { icon: Code2, title: "Webhooks", desc: "Real-time Discord notifications for logins, bans, HWID mismatches." },
];

const LANG_ICONS: Record<SdkTab, React.ElementType> = {
  Python: FileCode,
  "C#": Cpu,
  "C++": Cpu,
  Java: Globe,
  "Node.js": Server,
  PHP: FileCode,
};

export default function LandingPage() {
  const canvasRef = useThreeCanvas();
  const [activeTab, setActiveTab] = useState<SdkTab>("Python");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      {/* Sticky Nav */}
      <nav className="border-b border-border/40 bg-background/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden md:block">Features</a>
            <a href="#sdk" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden md:block">SDK</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden md:block">Pricing</a>
            <Link href="/login">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Sign In</span>
            </Link>
            <Link href="/register">
              <Button size="sm" className="font-semibold gap-1">Get Started <ArrowRight className="w-3.5 h-3.5" /></Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* ─── Hero ─── */}
        <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-6 overflow-hidden">
          {/* 3D canvas background */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0 }}
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-radial from-primary/15 via-transparent to-transparent pointer-events-none" style={{ zIndex: 1 }} />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent pointer-events-none" style={{ zIndex: 1 }} />

          <div className="relative z-10 max-w-5xl mx-auto text-center">
            {/* Logo + brand in hero */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-center gap-4 mb-10"
            >
              <motion.div
                animate={{ rotateY: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-primary/40 shadow-2xl shadow-primary/20"
                style={{ transformStyle: "preserve-3d" }}
              >
                <img src={logoImg} alt="Hex Auth" className="w-full h-full object-cover" />
              </motion.div>
              <div className="text-left">
                <div className="text-3xl font-black tracking-tight">
                  HEX<span className="text-primary">AUTH</span>
                </div>
                <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Authentication Platform</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold tracking-wide uppercase mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Hex Auth v2 is Live
              </div>

              <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.95] mb-8">
                The auth layer your
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary via-violet-400 to-indigo-400">
                  software deserves.
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
                Precision-built authentication, license key generation, and hardware ID locking for serious developers.
                <span className="text-foreground/70"> Drop it into your app in minutes.</span>
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="h-14 px-10 text-base font-bold gap-2 shadow-lg shadow-primary/25">
                    Start Building for Free <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <a href="#sdk">
                  <Button size="lg" variant="outline" className="h-14 px-10 text-base gap-2">
                    View SDK <ChevronRight className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mt-20 grid grid-cols-3 gap-4 max-w-2xl mx-auto"
            >
              {[
                { val: "51", label: "Developers", accent: false },
                { val: "42", label: "Apps Live", accent: false },
                { val: "42", label: "Users Protected", accent: true },
              ].map(({ val, label, accent }) => (
                <div key={label} className="p-6 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm">
                  <div className={`text-4xl font-black mb-1 ${accent ? "text-primary" : "text-foreground"}`}>{val}</div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-5 h-8 rounded-full border border-border/60 flex items-start justify-center p-1"
            >
              <div className="w-1 h-2 rounded-full bg-primary/60" />
            </motion.div>
          </motion.div>
        </section>

        {/* ─── Features ─── */}
        <section id="features" className="py-32 px-6 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto">
            <FadeInSection className="text-center mb-20">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold tracking-widest uppercase mb-6">
                Features
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-6">
                One control room for all your
                <span className="text-primary"> security needs</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg">
                No complex setups. No scattered tools. Everything you need to protect your software in one dashboard.
              </p>
            </FadeInSection>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.map((f, i) => (
                <SlideInCard key={f.title} delay={i * 0.06} className="group">
                  <motion.div
                    whileHover={{ y: -4, scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                    className="h-full p-6 rounded-2xl border border-border/60 bg-card/50 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-default"
                  >
                    <motion.div
                      whileHover={{ rotate: 15 }}
                      className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5"
                    >
                      <f.icon className="w-5 h-5 text-primary" />
                    </motion.div>
                    <h3 className="font-bold text-base mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </motion.div>
                </SlideInCard>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SDK Showcase ─── */}
        <section id="sdk" className="py-32 px-6 bg-card/40 border-y border-border/60 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Left */}
              <FadeInSection>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold tracking-widest uppercase mb-6">
                  SDK
                </div>
                <h2 className="text-4xl md:text-5xl font-black mb-6">
                  Drop-in SDK for
                  <span className="text-primary"> any language</span>
                </h2>
                <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                  Integrate Hex Auth into your application in under 5 minutes. Our SDKs handle encryption, hardware ID generation, and session management out of the box.
                </p>
                <ul className="space-y-4 mb-10">
                  {[
                    { icon: Shield, text: "AES-256 Encrypted Transport" },
                    { icon: Cpu, text: "Automatic HWID Generation" },
                    { icon: Zap, text: "Anti-Debugger & Anti-VM Checks" },
                    { icon: Lock, text: "Offline Blacklist Cache" },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-3 text-sm font-medium">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      {text}
                    </li>
                  ))}
                </ul>
                {/* Language pills */}
                <div className="flex flex-wrap gap-2">
                  {SDK_TABS.map((lang) => {
                    const Icon = LANG_ICONS[lang];
                    return (
                      <motion.button
                        key={lang}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setActiveTab(lang)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          activeTab === lang
                            ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                            : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {lang}
                      </motion.button>
                    );
                  })}
                </div>
              </FadeInSection>

              {/* Right — code block */}
              <FadeInSection delay={0.15}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-2xl border border-border/80 bg-[#080810] overflow-hidden shadow-2xl shadow-black/60"
                >
                  {/* Window chrome */}
                  <div className="h-11 border-b border-white/8 flex items-center px-4 gap-2 bg-white/3">
                    <div className="w-3 h-3 rounded-full bg-red-500/70" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                    <div className="w-3 h-3 rounded-full bg-green-500/70" />
                    <span className="ml-4 text-xs font-mono text-white/40">{SDK_CODE[activeTab].file}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs font-mono text-white/30">{activeTab}</span>
                      <a
                        href={`/api/downloads/sdk/${SDK_DOWNLOAD_KEY[activeTab]}`}
                        download
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 transition-all"
                        title={`Download ${SDK_CODE[activeTab].file}`}
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </a>
                    </div>
                  </div>
                  <div className="p-6 overflow-x-auto max-h-96 overflow-y-auto custom-scrollbar">
                    <pre className="text-sm font-mono leading-relaxed">
                      <code className="text-gray-300 whitespace-pre">{SDK_CODE[activeTab].code}</code>
                    </pre>
                  </div>
                </motion.div>
              </FadeInSection>
            </div>
          </div>
        </section>

        {/* ─── How it works ─── */}
        <section className="py-32 px-6">
          <div className="max-w-5xl mx-auto">
            <FadeInSection className="text-center mb-20">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold tracking-widest uppercase mb-6">
                How it works
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-6">
                Up and running in <span className="text-primary">3 steps</span>
              </h2>
            </FadeInSection>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { step: "01", title: "Create an App", desc: "Register on Hex Auth and create your application. Get your App ID and Secret from the dashboard." },
                { step: "02", title: "Install the SDK", desc: "Add one of our language SDKs to your project. Configure it with your credentials and API endpoint." },
                { step: "03", title: "Protect Your App", desc: "Call api.login() in your app. Users get HWID-locked, session-tracked, and license-verified automatically." },
              ].map(({ step, title, desc }, i) => (
                <SlideInCard key={step} delay={i * 0.1}>
                  <div className="relative p-8 rounded-2xl border border-border/60 bg-card/40 h-full">
                    <div className="text-6xl font-black text-primary/10 mb-4 font-mono">{step}</div>
                    <h3 className="font-bold text-lg mb-3">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                    {i < 2 && (
                      <div className="hidden md:block absolute top-1/2 -right-4 z-10">
                        <ChevronRight className="w-8 h-8 text-primary/20" />
                      </div>
                    )}
                  </div>
                </SlideInCard>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Pricing ─── */}
        <section id="pricing" className="py-32 px-6 bg-card/40 border-t border-border/60 relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="max-w-5xl mx-auto">
            <FadeInSection className="text-center mb-20">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold tracking-widest uppercase mb-6">
                Pricing
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                Simple, transparent <span className="text-primary">pricing</span>
              </h2>
              <p className="text-muted-foreground text-lg">Start for free. Scale when you're ready.</p>
            </FadeInSection>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Free */}
              <SlideInCard delay={0.05}>
                <motion.div whileHover={{ y: -4 }} className="p-8 rounded-2xl border border-border/60 bg-background h-full flex flex-col">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Free</div>
                  <div className="mb-8"><span className="text-5xl font-black">$0</span><span className="text-muted-foreground">/mo</span></div>
                  <ul className="space-y-3 mb-8 flex-1 text-sm">
                    {["50 Users", "Basic HWID Lock", "License Keys", "Community Support"].map(t => (
                      <li key={t} className="flex items-center gap-2"><Check />{t}</li>
                    ))}
                  </ul>
                  <Link href="/register"><Button className="w-full" variant="outline">Start Free</Button></Link>
                </motion.div>
              </SlideInCard>

              {/* Starter — highlighted */}
              <SlideInCard delay={0.1}>
                <motion.div whileHover={{ y: -4 }} className="relative p-8 rounded-2xl border-2 border-primary bg-primary/5 h-full flex flex-col shadow-2xl shadow-primary/10">
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider rounded-full whitespace-nowrap">
                    Most Popular
                  </div>
                  <div className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Starter</div>
                  <div className="mb-8"><span className="text-5xl font-black">$3</span><span className="text-muted-foreground">/mo</span></div>
                  <ul className="space-y-3 mb-8 flex-1 text-sm">
                    {["500 Users", "Advanced Security", "Discord Webhooks", "Event Logs", "Priority Support"].map(t => (
                      <li key={t} className="flex items-center gap-2"><Check />{t}</li>
                    ))}
                  </ul>
                  <Link href="/register"><Button className="w-full font-bold">Get Starter</Button></Link>
                </motion.div>
              </SlideInCard>

              {/* Pro */}
              <SlideInCard delay={0.15}>
                <motion.div whileHover={{ y: -4 }} className="p-8 rounded-2xl border border-border/60 bg-background h-full flex flex-col">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Pro</div>
                  <div className="mb-8"><span className="text-5xl font-black">$10</span><span className="text-muted-foreground">/mo</span></div>
                  <ul className="space-y-3 mb-8 flex-1 text-sm">
                    {["Unlimited Users", "White-label APIs", "Team Members", "Custom Variables", "24/7 Support"].map(t => (
                      <li key={t} className="flex items-center gap-2"><Check />{t}</li>
                    ))}
                  </ul>
                  <Link href="/register"><Button className="w-full" variant="outline">Get Pro</Button></Link>
                </motion.div>
              </SlideInCard>
            </div>

            {/* Payment methods */}
            <FadeInSection delay={0.2}>
              <div className="mt-12 text-center p-8 rounded-2xl bg-background border border-border/60">
                <p className="font-bold text-foreground mb-3 text-lg">Local Payment Methods</p>
                <p className="text-muted-foreground text-lg font-mono">
                  <span className="text-primary font-bold">bKash</span> · 01755334082 &nbsp;&nbsp;
                  <span className="text-primary font-bold">Nagad</span> · 01755334082
                </p>
                <p className="mt-3 text-sm text-muted-foreground/70">Contact support after sending payment to activate your plan manually.</p>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* ─── CTA Banner ─── */}
        <section className="py-32 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent pointer-events-none" />
          <FadeInSection className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center mb-8">
              <motion.div
                animate={{ rotateY: [0, 360] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="w-24 h-24 rounded-3xl overflow-hidden ring-4 ring-primary/30 shadow-2xl shadow-primary/20"
                style={{ transformStyle: "preserve-3d" }}
              >
                <img src={logoImg} alt="Hex Auth" className="w-full h-full object-cover" />
              </motion.div>
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              Ready to protect your
              <span className="text-primary"> software?</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              Join developers who trust Hex Auth to secure their applications.
            </p>
            <Link href="/register">
              <Button size="lg" className="h-14 px-12 text-lg font-bold gap-2 shadow-xl shadow-primary/25">
                Create Free Account <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </FadeInSection>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-16 border-t border-border/60 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
            <Logo size="md" />
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/terms"><span className="hover:text-foreground cursor-pointer transition-colors">Terms</span></Link>
              <Link href="/privacy"><span className="hover:text-foreground cursor-pointer transition-colors">Privacy</span></Link>
              <a href="#sdk" className="hover:text-foreground transition-colors">SDK</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            </div>
          </div>
          <div className="border-t border-border/40 pt-6 text-center text-sm text-muted-foreground/50">
            © {new Date().getFullYear()} Hex Auth. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function Check() {
  return (
    <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
