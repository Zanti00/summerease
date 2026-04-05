"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getCurrentUser } from "@/lib/actions/authActions";

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
