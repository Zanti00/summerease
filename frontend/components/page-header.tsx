"use client";

import { useHeader } from "@/lib/contexts/header-context";
import { Button } from "@/components/ui/button";
import { FileUp } from "lucide-react";
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

  return (
    <div className="flex flex-row justify-between items-center">
      <div className="flex flex-col gap-1 pb-4">
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>
      <Button className={"bg-primary p-5"}>
        <FileUp></FileUp>Upload File
      </Button>
    </div>
  );
}
