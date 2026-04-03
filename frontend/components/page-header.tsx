"use client";

import { useHeader } from "@/lib/contexts/header-context";
import { useEffect } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle = "" }: PageHeaderProps) {
  const { setTitle, setSubtitle } = useHeader();

  useEffect(() => {
    setTitle(title);
    setSubtitle(subtitle);

    // No cleanup required here, as the next PageHeader will overwrite it.
  }, [title, subtitle, setTitle, setSubtitle]);

  return null;
}
