import React, { createContext, useContext, useState } from "react";
import { User, useGetMe } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("hexauth_token"));
  // loginUser holds the user set directly after login (no extra round-trip needed)
  const [loginUser, setLoginUser] = useState<User | null>(null);

  const { data: meData, isLoading: isMeLoading } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    }
  });

  // Prefer the user data from the /me query (most up-to-date) if available,
  // fall back to what was set on login (avoids the one-render-cycle gap that
  // caused ProtectedRoute to redirect to /login right after a page refresh).
  const user: User | null = (meData as User | undefined) ?? loginUser ?? null;

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("hexauth_token", newToken);
    setToken(newToken);
    setLoginUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("hexauth_token");
    setToken(null);
    setLoginUser(null);
  };

  // Still loading if we have a token but the /me query hasn't finished AND
  // we don't yet have any user data at all.
  const isLoading = !!token && isMeLoading && !user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
