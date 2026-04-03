"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, ChevronUp, Settings } from "lucide-react";
import { logoutUser } from "@/lib/actions/logoutAction";
import { useRouter, usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { ROUTES } from "@/app/constants/routes";
import { useHeader } from "@/lib/contexts/header-context";
import { useEffect, useState } from "react";

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarItems } = useHeader();
  const [hash, setHash] = useState(() =>
    typeof window !== "undefined" ? window.location.hash : "",
  );

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) {
      router.push("/login");
    } else {
      console.error("Logout failed:", result.error?.message);
      // Optional: show a toast or error message
      // Even if API fails, we might want to force logout on client or just inform user
      router.push("/login"); // Force logout for better UX if session is invalid anyway
    }
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Settings className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-semibold text-sidebar-foreground">
              SummerEase
            </span>
            <span className="text-xs text-sidebar-foreground/70">v1.0.0</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => {
                // Logic for active state:
                // 1. If it's a hash link (e.g., #password), check if current hash matches
                // 2. If it's the root link for the page (e.g., /profile), check if it's active when no hash is present
                // 3. Otherwise, check if pathname matches exactly
                const isHashLink = item.url.startsWith("#");
                const isActive = isHashLink
                  ? hash === item.url
                  : pathname === item.url &&
                    (hash === "" || !sidebarItems.some((i) => i.url === hash));

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<a href={item.url} />}
                      isActive={isActive}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <User className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none text-left">
                  <span className="font-semibold text-sidebar-foreground line-clamp-1">
                    User Profile
                  </span>
                  <span className="text-xs text-sidebar-foreground/70 line-clamp-1">
                    user@example.com
                  </span>
                </div>
                <ChevronUp className="ml-auto" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" className="w-(--anchor-width)">
                <DropdownMenuItem className="cursor-pointer">
                  <Link
                    href={ROUTES.settings.account}
                    className="flex items-center gap-2"
                  >
                    <Settings className="size-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <Separator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive"
                >
                  <LogOut className="size-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
