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
import {
  Home,
  Inbox,
  Calendar,
  Search,
  Settings,
  LogOut,
  User,
  ChevronUp,
} from "lucide-react";
import { logoutUser } from "@/lib/actions/logoutAction";
import { useRouter } from "next/navigation";

// Menu items.
const items = [
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

export function AppSidebar() {
  const router = useRouter();

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
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton render={<a href={item.url} />}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
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
