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
  Menu
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

  return (
    <div className="flex min-h-screen w-full bg-background overflow-hidden text-foreground selection:bg-primary/30">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-border bg-card flex items-center justify-between px-4 z-50">
        <Logo size="sm" />
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border
        flex flex-col transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="p-6">
          <Logo />
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6 scrollbar-none">
          {navigation.map((group) => (
            <div key={group.label}>
              <div className="px-2 mb-2 text-xs font-semibold text-sidebar-foreground/50 tracking-wider">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location === item.href || location.startsWith(item.href + "/");
                  return (
                    <Link key={item.href} href={item.href}>
                      <span className={`
                        flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer
                        ${isActive 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"}
                      `}>
                        <item.icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-sidebar-foreground/70"}`} />
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-sidebar-border bg-sidebar/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.username}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-primary font-bold px-1.5 py-0.5 rounded-sm bg-primary/10 border border-primary/20">
                    {user?.plan || "FREE"}
                  </span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
