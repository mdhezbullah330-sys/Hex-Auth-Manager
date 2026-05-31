import React from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Terminal, Shield, Zap, Lock, Database, Code2, Layers, Key } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <Link href="/login">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Sign In</span>
            </Link>
            <Link href="/register">
              <Button size="sm" className="font-semibold">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background pointer-events-none" />
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold tracking-wide uppercase mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Hex Auth v2 is Live
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
                The auth layer your <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">software deserves.</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                Precision-built authentication, license key generation, and hardware ID locking for serious developers. Drop it into your app in minutes.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="h-12 px-8 text-base">Start Building for Free</Button>
                </Link>
                <Link href="/docs">
                  <Button size="lg" variant="outline" className="h-12 px-8 text-base">Read the Docs</Button>
                </Link>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto"
            >
              <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur">
                <div className="text-3xl font-bold text-foreground mb-1">51</div>
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Developers</div>
              </div>
              <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur">
                <div className="text-3xl font-bold text-foreground mb-1">42</div>
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Apps Live</div>
              </div>
              <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur">
                <div className="text-3xl font-bold text-primary mb-1">42</div>
                <div className="text-sm font-medium text-primary/80 uppercase tracking-wider">Users Protected</div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-card border-y border-border">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Everything you need to protect your software</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">No complex setups. No scattered tools. One unified control room for your app's security.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Shield, title: "HWID Lock", desc: "Lock accounts to specific hardware devices automatically." },
                { icon: Key, title: "License Keys", desc: "Generate, manage, and distribute secure product keys." },
                { icon: Zap, title: "Live Sessions", desc: "Monitor and terminate active user sessions instantly." },
                { icon: Lock, title: "Blacklist", desc: "Ban IPs, HWIDs, or usernames globally." },
                { icon: Database, title: "Variables", desc: "Store and serve encrypted remote variables to your app." },
                { icon: Layers, title: "File Hosting", desc: "Host secure payload files directly from the dashboard." },
                { icon: Terminal, title: "Event Logs", desc: "Granular audit trails of every action in your app." },
                { icon: Code2, title: "Webhooks", desc: "Get real-time Discord notifications for critical events." },
              ].map((f, i) => (
                <div key={i} className="p-6 rounded-xl border border-border bg-background hover:border-primary/50 transition-colors">
                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SDK Showcase */}
        <section className="py-24 px-6 relative">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Drop-in SDK for any language</h2>
              <p className="text-muted-foreground mb-6">Integrate Hex Auth into your Python, C++, C#, or Node.js application in less than 5 minutes. Our SDKs handle encryption, hardware ID generation, and session management out of the box.</p>
              <ul className="space-y-3 mb-8">
                {['Secure AES-256 Encryption', 'Anti-Debugger Checks', 'Automatic HWID Generation'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline">View Documentation</Button>
            </div>
            <div className="rounded-xl border border-border bg-[#0d0d12] overflow-hidden shadow-2xl">
              <div className="h-10 border-b border-white/10 flex items-center px-4 gap-2 bg-white/5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-4 text-xs font-mono text-white/50">main.py</span>
              </div>
              <div className="p-6 overflow-x-auto">
                <pre className="text-sm font-mono leading-relaxed text-gray-300">
                  <code dangerouslySetInnerHTML={{ __html: `from hexauth import HexAuth

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
else:
    print("Authentication failed.")`}} />
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24 bg-card border-t border-border">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Simple, transparent pricing</h2>
              <p className="text-muted-foreground">Start for free. Scale when you need to.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Free */}
              <div className="p-8 rounded-xl border border-border bg-background">
                <h3 className="text-xl font-bold mb-2">Free</h3>
                <div className="mb-6"><span className="text-4xl font-extrabold">$0</span><span className="text-muted-foreground">/mo</span></div>
                <ul className="space-y-4 mb-8 text-sm">
                  <li className="flex items-center gap-2"><Check /> 50 Users</li>
                  <li className="flex items-center gap-2"><Check /> Basic HWID Lock</li>
                  <li className="flex items-center gap-2"><Check /> Community Support</li>
                </ul>
                <Link href="/register"><Button className="w-full" variant="outline">Start Free</Button></Link>
              </div>
              {/* Starter */}
              <div className="p-8 rounded-xl border border-primary bg-primary/5 relative transform md:-translate-y-4 shadow-xl shadow-primary/10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-full">Most Popular</div>
                <h3 className="text-xl font-bold mb-2 text-primary">Starter</h3>
                <div className="mb-6"><span className="text-4xl font-extrabold text-foreground">$3</span><span className="text-muted-foreground">/mo</span></div>
                <ul className="space-y-4 mb-8 text-sm">
                  <li className="flex items-center gap-2"><Check /> 500 Users</li>
                  <li className="flex items-center gap-2"><Check /> Advanced Security</li>
                  <li className="flex items-center gap-2"><Check /> Discord Webhooks</li>
                  <li className="flex items-center gap-2"><Check /> Priority Support</li>
                </ul>
                <Link href="/register"><Button className="w-full">Get Starter</Button></Link>
              </div>
              {/* Pro */}
              <div className="p-8 rounded-xl border border-border bg-background">
                <h3 className="text-xl font-bold mb-2">Pro</h3>
                <div className="mb-6"><span className="text-4xl font-extrabold">$10</span><span className="text-muted-foreground">/mo</span></div>
                <ul className="space-y-4 mb-8 text-sm">
                  <li className="flex items-center gap-2"><Check /> Unlimited Users</li>
                  <li className="flex items-center gap-2"><Check /> White-label APIs</li>
                  <li className="flex items-center gap-2"><Check /> Team Members</li>
                  <li className="flex items-center gap-2"><Check /> 24/7 Support</li>
                </ul>
                <Link href="/register"><Button className="w-full" variant="outline">Get Pro</Button></Link>
              </div>
            </div>
            
            <div className="mt-16 text-center text-sm text-muted-foreground p-6 rounded-lg bg-background border border-border">
              <p className="font-medium text-foreground mb-2">Local Payment Methods</p>
              <p>Pay via bKash 01755334082 · Nagad 01755334082</p>
              <p className="mt-2 text-xs opacity-70">Contact support after sending payment to activate your plan manually.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-border bg-background text-center">
        <Logo size="md" className="justify-center mb-6 opacity-50 grayscale" />
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground mb-6">
          <Link href="/terms"><span className="hover:text-foreground cursor-pointer transition-colors">Terms of Service</span></Link>
          <Link href="/privacy"><span className="hover:text-foreground cursor-pointer transition-colors">Privacy Policy</span></Link>
          <Link href="/docs"><span className="hover:text-foreground cursor-pointer transition-colors">Documentation</span></Link>
        </div>
        <p className="text-sm text-muted-foreground/50">© {new Date().getFullYear()} Hex Auth. All rights reserved.</p>
      </footer>
    </div>
  );
}

function Check() {
  return <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinelinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
}
