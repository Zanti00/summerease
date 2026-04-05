import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
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
  { id: "general", label: "General", icon: Settings, url: "#" },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    url: ROUTES.settings.security,
  },
  { id: "account", label: "Account", icon: User, url: ROUTES.settings.account },
];

export function SettingsDialog({
  children,
  isBlurred = false,
  onOpenChange,
}: {
  children: ReactNode;
  isBlurred?: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleClose = () => {
    router.back();
  };

  const activeTab =
    SETTINGS_TABS.find((tab) => tab.url === pathname) || SETTINGS_TABS[0];

  return (
    <Dialog
      open={true}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
      }}
    >
      <DialogPortal>
        <DialogOverlay className="bg-black/40 backdrop-blur-sm" />
        <DialogContent
          className={cn(
            "max-w-[800px] h-[600px] p-0 overflow-hidden border-none shadow-2xl bg-zinc-900 text-zinc-100 flex transition-all duration-300 ease-in-out",
            isBlurred && "blur-md grayscale-[0.2] opacity-90",
          )}
        >
          {/* Left Sidebar */}
          <div className="w-[240px] bg-zinc-950 flex flex-col border-r border-zinc-800">
            <div className="p-4 flex items-center justify-between">
              <button
                onClick={(e) => {
                  onOpenChange(true);
                }}
                className="p-2 hover:bg-zinc-800 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              <div className="space-y-1">
                {SETTINGS_TABS.map((tab) => {
                  const isActive = tab.url === pathname;
                  return (
                    <Link
                      key={tab.id}
                      href={tab.url}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-left",
                        isActive
                          ? "bg-zinc-800 text-white"
                          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
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
          <div className="flex-1 flex flex-col bg-zinc-900">
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-xl mx-auto">
                <h1 className="text-xl font-bold mb-8">{activeTab.label}</h1>
                {children}
              </div>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
