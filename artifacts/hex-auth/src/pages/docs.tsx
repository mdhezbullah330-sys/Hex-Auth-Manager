import React, { useState } from "react";
import { Link } from "wouter";
import { Logo } from "@/components/logo";
import { motion } from "framer-motion";
import {
  ChevronRight, Copy, Check, Terminal, Lock, Key, Users, Database,
  Shield, Zap, Globe, Code2, AlertTriangle, BookOpen, Server
} from "lucide-react";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "authentication", label: "Authentication" },
  { id: "endpoints", label: "API Endpoints" },
  { id: "sdk-login", label: "  SDK Login" },
  { id: "sdk-validate", label: "  SDK Validate" },
  { id: "sdk-variable", label: "  SDK Variables" },
  { id: "auth-register", label: "  Register" },
  { id: "auth-verify", label: "  Verify Email" },
  { id: "auth-login", label: "  Login" },
  { id: "apps", label: "  Apps" },
  { id: "licenses", label: "  Licenses" },
  { id: "errors", label: "Error Codes" },
  { id: "quickstart", label: "Quick Start" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 px-2 py-1 text-xs text-white/40 hover:text-white/80 rounded transition-all"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ code, lang = "http" }: { code: string; lang?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#070710] overflow-hidden my-4">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/8 bg-white/3">
        <span className="text-xs font-mono text-white/30">{lang}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-sm font-mono leading-relaxed overflow-x-auto text-gray-300 whitespace-pre">{code}</pre>
    </div>
  );
}

function Badge({ type }: { type: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" }) {
  const colors: Record<string, string> = {
    GET: "bg-green-500/20 text-green-400 border-green-500/30",
    POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    PUT: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    PATCH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold border font-mono ${colors[type]}`}>{type}</span>
  );
}

function Endpoint({ method, path, desc, auth = false, children }: { method: "GET"|"POST"|"PUT"|"DELETE"|"PATCH"; path: string; desc: string; auth?: boolean; children?: React.ReactNode }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <Badge type={method} />
        <code className="font-mono text-sm text-white/90 bg-white/5 px-2 py-0.5 rounded">{path}</code>
        {auth && <span className="inline-flex items-center gap-1 text-xs text-yellow-400 border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 rounded"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Auth required</span>}
      </div>
      <p className="text-sm text-white/60 mb-3">{desc}</p>
      {children}
    </div>
  );
}

function Section({ id, icon: Icon, title, children }: { id: string; icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-16 scroll-mt-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Param({ name, type, required, desc }: { name: string; type: string; required?: boolean; desc: string }) {
  return (
    <tr className="border-b border-white/5">
      <td className="py-2 pr-4 font-mono text-sm text-primary">{name}</td>
      <td className="py-2 pr-4 font-mono text-xs text-white/40">{type}</td>
      <td className="py-2 pr-4 text-xs">{required ? <span className="text-red-400">required</span> : <span className="text-white/30">optional</span>}</td>
      <td className="py-2 text-sm text-white/60">{desc}</td>
    </tr>
  );
}

function ParamTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 overflow-hidden my-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white/3 text-white/40 text-xs uppercase tracking-wider">
            <th className="text-left py-2 px-4">Field</th>
            <th className="text-left py-2 px-4">Type</th>
            <th className="text-left py-2 px-4">Required</th>
            <th className="text-left py-2 px-4">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 px-4">{children}</tbody>
      </table>
    </div>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl h-14 flex items-center px-6 gap-4">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <Logo size="sm" />
          </div>
        </Link>
        <ChevronRight className="w-4 h-4 text-white/30" />
        <span className="text-sm font-semibold text-white/70">API Reference</span>
        <div className="ml-auto flex items-center gap-3">
          <a href="/api/downloads/sdk/python" download className="text-xs text-primary hover:text-primary/80 transition-colors">Download SDK</a>
          <Link href="/login">
            <span className="text-xs bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer">Sign In</span>
          </Link>
        </div>
      </header>

      <div className="flex pt-14">
        {/* Sidebar */}
        <aside className="fixed left-0 top-14 bottom-0 w-56 border-r border-border/60 bg-background/60 overflow-y-auto hidden lg:block">
          <nav className="p-4 space-y-1">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setActiveSection(s.id)}
                className={`block px-3 py-1.5 rounded-lg text-sm transition-all ${
                  s.label.startsWith("  ") ? "pl-6 text-xs" : "font-semibold"
                } ${activeSection === s.id ? "bg-primary/20 text-primary" : "text-white/50 hover:text-white/80 hover:bg-white/5"}`}
              >
                {s.label.trim()}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-56 max-w-4xl mx-auto px-6 py-12">

          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold mb-4">
              <BookOpen className="w-3 h-3" /> API Reference v1
            </div>
            <h1 className="text-4xl font-black mb-4">Hex Auth API</h1>
            <p className="text-lg text-white/60 leading-relaxed max-w-2xl">
              Full REST API for JWT authentication, hardware ID binding, license key management, and remote variables. Base URL: <code className="text-primary font-mono text-sm bg-primary/10 px-1 rounded">https://your-domain/api</code>
            </p>
          </motion.div>

          {/* Overview */}
          <Section id="overview" icon={Globe} title="Overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {[
                { icon: Zap, title: "JWT Sessions", desc: "Stateless auth via signed JWT tokens. Short-lived, secure." },
                { icon: Shield, title: "HWID Binding", desc: "First login binds the hardware ID. Later logins from other hardware are rejected." },
                { icon: Key, title: "License Keys", desc: "Generate HEX-XXXX format keys. Redeem, expire, and manage from the dashboard." },
                { icon: Database, title: "Remote Variables", desc: "Store encrypted strings server-side. Fetch at runtime via SDK." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-xl border border-border/60 bg-card/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">{title}</span>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-white/70">
              <strong className="text-white">Base URL:</strong> <code className="text-primary font-mono">https://your-domain/api</code><br />
              <strong className="text-white">Content-Type:</strong> <code className="font-mono">application/json</code> for all requests<br />
              <strong className="text-white">Rate limit:</strong> 100 requests / minute per IP
            </div>
          </Section>

          {/* Authentication */}
          <Section id="authentication" icon={Lock} title="Authentication">
            <p className="text-white/60 mb-4">Protected routes require a JWT token in the <code className="text-primary font-mono text-sm">Authorization</code> header:</p>
            <CodeBlock lang="http" code={`Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`} />
            <p className="text-white/60 text-sm">Tokens are returned on login and email verification. They expire after <strong className="text-white">7 days</strong>. Store in <code className="font-mono text-primary text-sm">localStorage</code> as <code className="font-mono text-primary text-sm">hexauth_token</code>.</p>
          </Section>

          {/* SDK Endpoints */}
          <Section id="endpoints" icon={Terminal} title="API Endpoints">
            <p className="text-white/60 mb-8">All endpoints are prefixed with <code className="text-primary font-mono text-sm">/api</code>. SDK endpoints are used directly by your application's users via the SDK.</p>

            {/* SDK Login */}
            <h3 id="sdk-login" className="text-lg font-bold mb-4 text-white/90 scroll-mt-24 border-b border-white/10 pb-2">SDK Endpoints</h3>

            <Endpoint method="POST" path="/api/sdk/login" desc="Authenticate an end-user via the SDK. Binds HWID on first login. Returns a session token.">
              <strong className="text-xs text-white/50 uppercase tracking-wider">Request body</strong>
              <ParamTable>
                <Param name="appId" type="string" required desc="Your App ID (from dashboard → Apps)" />
                <Param name="username" type="string" required desc="End-user's username" />
                <Param name="password" type="string" required desc="End-user's password" />
                <Param name="hwid" type="string" required desc="Hardware ID of the end-user's machine (generate with SDK helper)" />
                <Param name="version" type="string" desc="Your app version string (e.g. '1.0')" />
              </ParamTable>
              <strong className="text-xs text-white/50 uppercase tracking-wider">Response</strong>
              <CodeBlock lang="json" code={`{
  "ok": true,
  "sessionToken": "sess_abc123...",
  "user": {
    "username": "developer123",
    "plan": "pro",
    "expiresAt": "2026-12-31T00:00:00.000Z"
  }
}`} />
              <strong className="text-xs text-white/50 uppercase tracking-wider">Error responses</strong>
              <CodeBlock lang="json" code={`{ "ok": false, "message": "Invalid credentials" }
{ "ok": false, "message": "Account banned" }
{ "ok": false, "message": "HWID mismatch — contact support to reset" }
{ "ok": false, "message": "Version mismatch" }`} />
            </Endpoint>

            {/* SDK Validate */}
            <Endpoint id="sdk-validate" method="POST" path="/api/sdk/validate" desc="Validate an existing session token. Call this on app startup to check if the session is still active.">
              <ParamTable>
                <Param name="sessionToken" type="string" required desc="Session token returned from /sdk/login" />
              </ParamTable>
              <CodeBlock lang="json" code={`{
  "ok": true,
  "user": { "username": "developer123", "plan": "pro" }
}`} />
            </Endpoint>

            {/* SDK Variable */}
            <Endpoint id="sdk-variable" method="GET" path="/api/sdk/variable/:name" auth desc="Fetch a remote variable by name. Requires a valid session token in Authorization header." >
              <CodeBlock lang="http" code={`GET /api/sdk/variable/download_url
Authorization: Bearer sess_abc123...`} />
              <CodeBlock lang="json" code={`{ "name": "download_url", "value": "https://cdn.example.com/app.exe" }`} />
            </Endpoint>

            {/* Auth Register */}
            <h3 id="auth-register" className="text-lg font-bold mb-4 text-white/90 scroll-mt-24 border-b border-white/10 pb-2">Dashboard Auth</h3>

            <Endpoint method="POST" path="/api/auth/register" desc="Register a new dashboard account. Sends a 6-digit verification code to the provided email.">
              <ParamTable>
                <Param name="username" type="string" required desc="Unique username (3–30 chars, alphanumeric + underscores)" />
                <Param name="email" type="string" required desc="Valid email address" />
                <Param name="password" type="string" required desc="Password (min 8 chars)" />
              </ParamTable>
              <CodeBlock lang="json" code={`{
  "ok": true,
  "requiresVerification": true,
  "message": "Verification code sent to your email"
}`} />
            </Endpoint>

            {/* Auth Verify */}
            <Endpoint id="auth-verify" method="POST" path="/api/auth/verify-email" desc="Submit the 6-digit code to verify your email. Returns a JWT on success.">
              <ParamTable>
                <Param name="email" type="string" required desc="Email address used during registration" />
                <Param name="code" type="string" required desc="6-digit verification code" />
              </ParamTable>
              <CodeBlock lang="json" code={`{
  "ok": true,
  "token": "eyJhbGci...",
  "user": { "id": 1, "username": "dev", "email": "dev@example.com", "plan": "free", "emailVerified": true }
}`} />
            </Endpoint>

            {/* Auth Login */}
            <Endpoint id="auth-login" method="POST" path="/api/auth/login" desc="Login to the dashboard. Returns a JWT token valid for 7 days.">
              <ParamTable>
                <Param name="identifier" type="string" required desc="Email or username" />
                <Param name="password" type="string" required desc="Password" />
              </ParamTable>
              <CodeBlock lang="json" code={`{
  "ok": true,
  "token": "eyJhbGci...",
  "user": { "id": 1, "username": "dev", "plan": "free", "role": "owner" }
}`} />
            </Endpoint>

            {/* Apps */}
            <h3 id="apps" className="text-lg font-bold mb-4 text-white/90 scroll-mt-24 border-b border-white/10 pb-2">Apps</h3>

            <Endpoint method="GET" path="/api/apps" auth desc="List all apps owned by the authenticated user.">
              <CodeBlock lang="json" code={`[
  { "id": "uuid", "name": "My App", "appId": "app_xxx", "userCount": 42, "createdAt": "..." }
]`} />
            </Endpoint>

            <Endpoint method="POST" path="/api/apps" auth desc="Create a new protected application.">
              <ParamTable>
                <Param name="name" type="string" required desc="App display name" />
                <Param name="version" type="string" desc="Current app version (e.g. '1.0')" />
                <Param name="description" type="string" desc="Optional description" />
              </ParamTable>
            </Endpoint>

            <Endpoint method="PUT" path="/api/apps/:id" auth desc="Update an existing app's name, version, or status." >
              <ParamTable>
                <Param name="name" type="string" desc="New app name" />
                <Param name="version" type="string" desc="New version string" />
                <Param name="status" type="string" desc="'active' or 'disabled'" />
              </ParamTable>
            </Endpoint>

            <Endpoint method="DELETE" path="/api/apps/:id" auth desc="Delete an app and all its associated data." />

            <Endpoint method="POST" path="/api/apps/:id/rotate-secret" auth desc="Rotate the app secret. Returns the new secret. Old sessions remain valid." >
              <CodeBlock lang="json" code={`{ "appSecret": "new_secret_abc123..." }`} />
            </Endpoint>

            {/* Licenses */}
            <h3 id="licenses" className="text-lg font-bold mb-4 text-white/90 scroll-mt-24 border-b border-white/10 pb-2">Licenses</h3>

            <Endpoint method="GET" path="/api/licenses" auth desc="List all license keys. Supports query filters.">
              <ParamTable>
                <Param name="appId" type="string" desc="Filter by app ID" />
                <Param name="status" type="string" desc="Filter: 'active', 'used', 'expired'" />
              </ParamTable>
            </Endpoint>

            <Endpoint method="POST" path="/api/licenses/generate" auth desc="Generate one or more license keys (HEX-XXXX format).">
              <ParamTable>
                <Param name="count" type="number" required desc="Number of keys to generate (1–100)" />
                <Param name="appId" type="string" required desc="App to associate keys with" />
                <Param name="plan" type="string" desc="Plan to assign: 'free', 'starter', 'pro'" />
                <Param name="expiresInDays" type="number" desc="Days until key expires after redemption" />
              </ParamTable>
              <CodeBlock lang="json" code={`{ "keys": ["HEX-A1B2-C3D4", "HEX-E5F6-A7B8", "HEX-C9D0-E1F2"] }`} />
            </Endpoint>

            <Endpoint method="POST" path="/api/licenses/redeem" auth desc="Redeem a license key for the authenticated user.">
              <ParamTable>
                <Param name="key" type="string" required desc="License key (e.g. HEX-A1B2-C3D4)" />
              </ParamTable>
            </Endpoint>
          </Section>

          {/* Errors */}
          <Section id="errors" icon={AlertTriangle} title="Error Codes">
            <div className="rounded-xl border border-white/8 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/3 text-white/40 text-xs uppercase tracking-wider">
                    <th className="text-left py-2 px-4">HTTP</th>
                    <th className="text-left py-2 px-4">Meaning</th>
                    <th className="text-left py-2 px-4">Common cause</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    ["200", "OK", "Request succeeded"],
                    ["201", "Created", "Resource created (register, generate keys)"],
                    ["400", "Bad Request", "Missing/invalid fields in request body"],
                    ["401", "Unauthorized", "Invalid or expired JWT / wrong credentials"],
                    ["403", "Forbidden", "Valid token but insufficient permissions"],
                    ["404", "Not Found", "Resource doesn't exist"],
                    ["409", "Conflict", "Duplicate (username/email already registered)"],
                    ["429", "Rate Limited", "Too many requests, slow down"],
                    ["500", "Server Error", "Unexpected server-side failure"],
                  ].map(([code, name, cause]) => (
                    <tr key={code} className="hover:bg-white/2 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-primary text-sm">{code}</td>
                      <td className="py-2.5 px-4 font-semibold text-sm">{name}</td>
                      <td className="py-2.5 px-4 text-white/50 text-sm">{cause}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-white/50 mt-4">All error responses follow the same shape: <code className="font-mono text-primary text-xs">{"{ \"error\": \"message\" }"}</code> or <code className="font-mono text-primary text-xs">{"{ \"ok\": false, \"message\": \"...\" }"}</code></p>
          </Section>

          {/* Quick Start */}
          <Section id="quickstart" icon={Zap} title="Quick Start">
            <p className="text-white/60 mb-4">Integrate Hex Auth into your app in under 5 minutes using the Python SDK:</p>
            <CodeBlock lang="python" code={`# 1. Download hexauth.py from /api/downloads/sdk/python
# 2. Place it next to your main script

from hexauth import HexAuth

# Initialize with your App ID and Secret (from Dashboard → Apps)
api = HexAuth(
    app_id="YOUR_APP_ID",
    app_secret="YOUR_APP_SECRET",
    version="1.0",
    endpoint="https://your-domain/api"
)

# Authenticate your user
result = api.login("username", "password")

if result.ok:
    print(f"Welcome {result.user.username}! Plan: {result.user.plan}")

    # Fetch a remote variable
    dl = api.get_variable("download_url")
    print(f"Update URL: {dl.value}")
else:
    print(f"Login failed: {result.message}")
    exit(1)`} />
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mt-4">
              <p className="text-sm text-white/70">
                <strong className="text-primary">Need help?</strong> Your App ID and Secret are shown in Dashboard → Apps → click any app.
                HWID is generated automatically by the SDK using your end-user's hardware fingerprint.
              </p>
            </div>
          </Section>

        </main>
      </div>
    </div>
  );
}
