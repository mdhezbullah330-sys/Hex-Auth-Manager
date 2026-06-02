import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Box, 
  Users, 
  Key, 
  KeyRound,
  CreditCard,
  Activity,
  ShieldBan,
  TerminalSquare,
  Settings,
  FolderOpen,
  ArrowUpCircle,
  BookOpen,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useLogout } from "@workspace/api-client-react";

interface SidebarGroup {
  label: string;
  items: {
    icon: React.ElementType;
    label: string;
    href: string;
  }[];
}

const navigation: SidebarGroup[] = [
  {
    label: "WORKSPACE",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
      { icon: Box, label: "Manage Apps", href: "/apps" },
      { icon: Users, label: "Users", href: "/users" },
      { icon: Key, label: "Licenses", href: "/licenses" },
      { icon: KeyRound, label: "API Tokens", href: "/api-tokens" },
    ],
  },
  {
    label: "ACTIVITY",
    items: [
      { icon: CreditCard, label: "Subscriptions", href: "/subscriptions" },
      { icon: Activity, label: "Sessions", href: "/sessions" },
      { icon: ShieldBan, label: "Blacklist", href: "/blacklist" },
      { icon: TerminalSquare, label: "Event Logs", href: "/event-logs" },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { icon: FolderOpen, label: "Files", href: "/files" },
      { icon: Settings, label: "Settings", href: "/settings" },
    ],
  },
  {
    label: "RESOURCES",
    items: [
      { icon: ArrowUpCircle, label: "Upgrade Plan", href: "/settings?tab=plan" },
      { icon: BookOpen, label: "Documentation", href: "/docs" },
    ],
  },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const logoutMutation = useLogout();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        logout();
        setLocation("/login");
      }
    });
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 flex items-center justify-between">
        <Logo />
        <button
          className="md:hidden p-1 rounded text-sidebar-foreground/50 hover:text-sidebar-foreground"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5 scrollbar-none">
        {navigation.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-1.5 text-[10px] font-bold text-sidebar-foreground/40 tracking-widest uppercase">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  location === item.href ||
                  location.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                    <span
                      className={`
                        group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                        cursor-pointer select-none overflow-hidden
                        transition-all duration-200 ease-out
                        ${isActive
                          ? "bg-primary/15 text-foreground shadow-sm"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                        }
                      `}
                    >
                      {/* Active left bar */}
                      <span
                        className={`
                          absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-r-full bg-primary
                          transition-all duration-300 ease-out
                          ${isActive ? "h-5 opacity-100" : "h-0 opacity-0"}
                        `}
                      />

                      {/* Icon with scale+color transition */}
                      <item.icon
                        className={`
                          w-4 h-4 shrink-0
                          transition-all duration-200 ease-out
                          ${isActive
                            ? "text-primary scale-110"
                            : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80 group-hover:scale-105"
                          }
                        `}
                      />

                      {/* Label with slide */}
                      <span className="truncate leading-none">{item.label}</span>

                      {/* Active glow dot */}
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate leading-tight">{user?.username}</p>
              <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                {user?.plan || "FREE"}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={handleLogout}
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-background overflow-hidden text-foreground selection:bg-primary/30">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-border bg-card/95 backdrop-blur-sm flex items-center justify-between px-4 z-50">
        <Logo size="sm" />
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 z-40 h-screen w-60 bg-sidebar border-r border-sidebar-border flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Drawer */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="fixed top-0 left-0 z-50 h-screen w-60 bg-sidebar border-r border-sidebar-border flex flex-col md:hidden animate-in slide-in-from-left duration-200">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 md:ml-60 pt-14 md:pt-0">
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
