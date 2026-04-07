"use client";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { HeaderProvider, useHeader } from "@/lib/contexts/header-context";
import { SettingsHashController } from "@/components/settings-hash-controller";

function HeaderDisplay() {
  const { title, subtitle } = useHeader();
  return (
    <div className="flex flex-col gap-0.5">
      <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">
        {title}
      </h1>
      <p className="text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HeaderProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b my-4 p-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <HeaderDisplay />
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-2">
            {children}
            <SettingsHashController />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </HeaderProvider>
  );
}
