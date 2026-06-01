import React, { useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import VerifyEmailPage from "@/pages/verify-email";
import DashboardPage from "@/pages/dashboard";
import AppsPage from "@/pages/apps";
import UsersPage from "@/pages/users";
import LicensesPage from "@/pages/licenses";
import ApiTokensPage from "@/pages/api-tokens";
import SubscriptionsPage from "@/pages/subscriptions";
import SessionsPage from "@/pages/sessions";
import BlacklistPage from "@/pages/blacklist";
import EventLogsPage from "@/pages/event-logs";
import SettingsPage from "@/pages/settings";
import DocsPage from "@/pages/docs";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ElementType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/docs" component={DocsPage} />
      
      <Route path="/dashboard"><ProtectedRoute component={DashboardPage} /></Route>
      <Route path="/apps"><ProtectedRoute component={AppsPage} /></Route>
      <Route path="/users"><ProtectedRoute component={UsersPage} /></Route>
      <Route path="/licenses"><ProtectedRoute component={LicensesPage} /></Route>
      <Route path="/api-tokens"><ProtectedRoute component={ApiTokensPage} /></Route>
      <Route path="/subscriptions"><ProtectedRoute component={SubscriptionsPage} /></Route>
      <Route path="/sessions"><ProtectedRoute component={SessionsPage} /></Route>
      <Route path="/blacklist"><ProtectedRoute component={BlacklistPage} /></Route>
      <Route path="/event-logs"><ProtectedRoute component={EventLogsPage} /></Route>
      <Route path="/settings"><ProtectedRoute component={SettingsPage} /></Route>
      <Route path="/files"><ProtectedRoute component={() => <div className="p-8 text-center text-muted-foreground">Files feature coming soon.</div>} /></Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
