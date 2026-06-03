import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
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

function NavItem({
  item,
  isActive,
  onClick,
}: {
  item: SidebarGroup["items"][number];
  isActive: boolean;
  onClick: () => void;
}) {
  const [clicked, setClicked] = React.useState(false);

  const handleClick = () => {
    setClicked(true);
    setTimeout(() => setClicked(false), 500);
    onClick();
  };

  return (
    <Link href={item.href} onClick={handleClick}>
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

        {/* Click ripple */}
        <AnimatePresence>
          {clicked && (
            <motion.span
              key="ripple"
              className="absolute inset-0 rounded-lg bg-primary/20"
              initial={{ opacity: 0.6, scale: 0.5 }}
              animate={{ opacity: 0, scale: 1.8 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>

        {/* Animated icon */}
        <motion.span
          className="shrink-0"
          animate={
            clicked
              ? { rotate: [0, -15, 12, -6, 0], scale: [1, 1.3, 0.9, 1.1, 1] }
              : isActive
              ? { scale: 1.1 }
              : { scale: 1 }
          }
          transition={
            clicked
              ? { duration: 0.45, ease: "easeInOut" }
              : { duration: 0.2 }
          }
        >
          <item.icon
            className={`
              w-4 h-4
              transition-colors duration-200
              ${isActive
                ? "text-primary"
                : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
              }
            `}
          />
        </motion.span>

        {/* Label */}
        <span className="truncate leading-none">{item.label}</span>

        {/* Active glow dot */}
        {isActive && (
          <motion.span
            className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </span>
    </Link>
  );
}

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
        setLocation("/");
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
                  <NavItem
                    key={item.href}
                    item={item}
                    isActive={isActive}
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
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
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.aside
              key="drawer"
              className="fixed top-0 left-0 z-50 h-screen w-60 bg-sidebar border-r border-sidebar-border flex flex-col md:hidden"
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

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
