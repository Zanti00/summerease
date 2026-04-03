"use client";

import { useHeader, SidebarItem, DEFAULT_SIDEBAR_ITEMS } from "@/lib/contexts/header-context";
import { useEffect } from "react";

interface PageSidebarProps {
  items: SidebarItem[];
}

export function PageSidebar({ items }: PageSidebarProps) {
  const { setSidebarItems } = useHeader();

  useEffect(() => {
    setSidebarItems(items);

    // IMPORTANT: Restore default items when the page unmounts
    return () => {
      setSidebarItems(DEFAULT_SIDEBAR_ITEMS);
    };
  }, [items, setSidebarItems]);

  return null;
}
