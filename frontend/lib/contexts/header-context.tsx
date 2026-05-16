"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Home, Inbox, Calendar, Search, Settings, LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  {
    title: "Home",
    url: "#",
    icon: Home,
  },
  {
    title: "Inbox",
    url: "#",
    icon: Inbox,
  },
  {
    title: "Calendar",
    url: "#",
    icon: Calendar,
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
];

interface HeaderContextType {
  title: string;
  subtitle: string;
  navItems: NavItem[];
  setTitle: (title: string) => void;
  setSubtitle: (subtitle: string) => void;
  setNavItems: (items: NavItem[]) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("Dashboard");
  const [subtitle, setSubtitle] = useState("Welcome back to SummerEase");
  const [navItems, setNavItems] = useState<NavItem[]>(DEFAULT_NAV_ITEMS);

  return (
    <HeaderContext.Provider
      value={{
        title,
        subtitle,
        navItems,
        setTitle,
        setSubtitle,
        setNavItems,
      }}
    >
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const context = useContext(HeaderContext);
  if (context === undefined) {
    throw new Error("useHeader must be used within a HeaderProvider");
  }
  return context;
}

