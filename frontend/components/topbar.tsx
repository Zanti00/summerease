"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Settings, ChevronRight } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { logoutUser } from "@/lib/actions/logoutAction";
import { ROUTES } from "@/app/constants/routes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) {
      logout();
      router.push(`${ROUTES.auth.login}?loggedOut=true`);
    } else {
      console.error("Logout failed:", result.error?.message);
      router.push(ROUTES.auth.login);
    }
  };

  const pathSegments = pathname.split("/").filter(Boolean);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between border-b bg-secondary-background px-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/"
          className="hover:text-foreground transition-colors font-medium"
        >
          SummerEase
        </Link>
        {pathSegments.map((segment, index) => {
          const href = `/${pathSegments.slice(0, index + 1).join("/")}`;
          const isLast = index === pathSegments.length - 1;

          return (
            <div key={href} className="flex items-center gap-2">
              <ChevronRight className="size-4 opacity-50" />
              <Link
                href={href}
                className={cn(
                  "hover:text-foreground transition-colors capitalize",
                  isLast && "font-medium text-foreground pointer-events-none",
                )}
              >
                {segment.replace(/-/g, " ")}
              </Link>
            </div>
          );
        })}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-muted transition-colors"
            />
          }
        >
          <User className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-1">
          <div className="flex flex-col p-2 border-b mb-1">
            <span className="font-semibold text-sm line-clamp-1">
              {isLoading ? "Loading..." : user?.username || "Guest User"}
            </span>
            <span className="text-xs text-muted-foreground line-clamp-1">
              {isLoading ? "Please wait" : user?.email || "not logged in"}
            </span>
          </div>
          <DropdownMenuItem
            render={
              <Link
                href={ROUTES.settings.account}
                className="flex items-center gap-2 w-full px-2 py-1.5"
              />
            }
            className="cursor-pointer rounded-sm"
          >
            <Settings className="size-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 rounded-sm px-2 py-1.5"
          >
            <LogOut className="size-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
