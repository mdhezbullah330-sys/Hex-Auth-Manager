import React, { createContext, useContext, useState } from "react";
import { User, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

interface SelectedProject {
  ownerId: string;
  ownerUsername: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  selectedProject: SelectedProject | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  selectProject: (project: SelectedProject | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("hexauth_token"));
  const [loginUser, setLoginUser] = useState<User | null>(null);
  const [selectedProject, setSelectedProject] = useState<SelectedProject | null>(() => {
    try {
      const stored = localStorage.getItem("hexauth_project");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const { data: meData, isLoading: isMeLoading } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false,
    }
  });

  const user: User | null = (meData as User | undefined) ?? loginUser ?? null;

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("hexauth_token", newToken);
    setToken(newToken);
    setLoginUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("hexauth_token");
    localStorage.removeItem("hexauth_project");
    setToken(null);
    setLoginUser(null);
    setSelectedProject(null);
  };

  const selectProject = (project: SelectedProject | null) => {
    setSelectedProject(project);
    if (project) {
      localStorage.setItem("hexauth_project", JSON.stringify(project));
    } else {
      localStorage.removeItem("hexauth_project");
    }
  };

  const isLoading = !!token && isMeLoading && !user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        selectedProject,
        login,
        logout,
        selectProject,
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
