"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Home, Inbox, Calendar, Search, Settings, LucideIcon } from "lucide-react";

export interface SidebarItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export const DEFAULT_SIDEBAR_ITEMS: SidebarItem[] = [
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
  sidebarItems: SidebarItem[];
  setTitle: (title: string) => void;
  setSubtitle: (subtitle: string) => void;
  setSidebarItems: (items: SidebarItem[]) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("Dashboard");
  const [subtitle, setSubtitle] = useState("Welcome back to SummerEase");
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>(DEFAULT_SIDEBAR_ITEMS);

  return (
    <HeaderContext.Provider
      value={{
        title,
        subtitle,
        sidebarItems,
        setTitle,
        setSubtitle,
        setSidebarItems,
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

