import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import { Settings, Shield, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { ROUTES } from "@/app/constants/routes";

const SETTINGS_TABS = [
  { id: "account", label: "Account", icon: User, url: ROUTES.settings.account },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    url: ROUTES.settings.security,
  },
];

export function SettingsDialog({
  children,
  isBlurred = false,
}: {
  children: ReactNode;
  isBlurred?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hash, setHash] = useState(() =>
    typeof window !== "undefined" ? window.location.hash : "",
  );

  useEffect(() => {
    const handleSync = () => {
      const currentHash = window.location.hash;
      if (currentHash !== hash) setHash(currentHash);
    };

    window.addEventListener("hashchange", handleSync);
    handleSync();

    return () => window.removeEventListener("hashchange", handleSync);
  }, [pathname, searchParams, hash]);

  const handleClose = () => {
    window.location.hash = "";
  };

  const activeTab =
    SETTINGS_TABS.find((tab) => hash.startsWith(tab.url)) || SETTINGS_TABS[0];

  return (
    <Dialog
      open={true}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleClose();
        }
      }}
    >
      <DialogPortal>
        <DialogOverlay className="bg-black/40 backdrop-blur-sm" />
        <DialogContent
          className={cn(
            "max-w-[800px] h-[600px] p-0 overflow-hidden border-none shadow-2xl bg-background text-zinc-100 flex transition-all duration-300 ease-in-out",
            isBlurred && "blur-md grayscale-[0.2] opacity-90",
          )}
        >
          {/* Left Sidebar */}
          <div className="w-[240px] bg-secondary-background flex flex-col shadow-md">
            <div className="p-4 flex items-center justify-between">
              <button
                onClick={handleClose}
                className="p-2 hover:bg-zinc-800 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              <div className="space-y-1">
                {SETTINGS_TABS.map((tab) => {
                  const isActive = hash.startsWith(tab.url);
                  return (
                    <Link
                      key={tab.id}
                      href={tab.url}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-left",
                        isActive
                          ? "bg-chart-1 text-primary-foreground"
                          : "text-primary-foreground hover:bg-chart-2 hover:text-primary-foreground",
                      )}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="flex-1 flex flex-col bg-background">
            <div className="flex-1 overflow-y-auto py-8">
              <div className="max-w-xl mx-auto">
                <h1 className="text-xl text-foreground font-bold mb-8">
                  {activeTab.label}
                </h1>
                {children}
              </div>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
