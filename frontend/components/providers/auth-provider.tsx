"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getCurrentUser, clearAuthCookies } from "@/lib/actions/authActions";

interface User {
  id: string;
  email: string;
  username?: string;
  mfa_enabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User | null) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setAuth = useCallback((userData: User | null) => {
    setUser(userData);
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    // Initial check for session restore
    const restoreSession = async () => {
      try {
        const result = await getCurrentUser();
        if (result.success && result.data?.user) {
          setAuth(result.data.user);
        } else {
          setIsLoading(false);
        }
      } catch {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, [setAuth]);

  // Global fetch interceptor to handle 401s
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isRedirecting = false;
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      if (response.status === 401 && !isRedirecting) {
        const urlStr = typeof args[0] === "string" ? args[0] : (args[0] instanceof Request ? args[0].url : "");
        const isAuthEndpoint = urlStr.includes("/auth/login") || 
                               urlStr.includes("/auth/verify-password") || 
                               urlStr.includes("/auth/logout") ||
                               urlStr.includes("/auth/refresh");
        
        if (!isAuthEndpoint) {
          isRedirecting = true;
          logout();
          
          clearAuthCookies().finally(() => {
            window.location.href = "/login?error=session_expired";
          });
        }
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        setAuth,
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
