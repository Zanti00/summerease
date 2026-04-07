"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { SettingsDialog } from "@/components/settings-dialog";
import { AccountForm } from "@/components/account-form";
import { SecurityForm } from "@/components/security-form";

export function SettingsHashController() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hash, setHash] = useState(() =>
    typeof window !== "undefined" ? window.location.hash : "",
  );
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  useEffect(() => {
    const handleSync = () => {
      const currentHash = window.location.hash;
      if (currentHash !== hash) setHash(currentHash);
      
      // Reset sub-modal state on main hash change if needed
      if (!currentHash.includes("/setup")) {
        setIsSubModalOpen(false);
      }
    };

    window.addEventListener("hashchange", handleSync);
    handleSync();

    return () => window.removeEventListener("hashchange", handleSync);
  }, [pathname, searchParams, hash]);

  // Check if we are in settings at all
  if (!hash.startsWith("#settings")) {
    return null;
  }

  // Determine which content to show
  const isSecurity = hash.startsWith("#settings/security");
  const isAccount = hash.startsWith("#settings/account");
  
  // Handle sub-modal state from hash
  const isSetupSubModal = hash.endsWith("/setup");
  const activeBlur = isSubModalOpen || isSetupSubModal;

  return (
    <SettingsDialog isBlurred={activeBlur}>
      {isAccount && <AccountForm />}
      {isSecurity && (
        <SecurityForm 
          onSetupOpenChange={(isOpen) => {
            setIsSubModalOpen(isOpen);
            if (isOpen) {
              // Optionally update hash to reflect submodal
              if (!window.location.hash.endsWith("/setup")) {
                window.location.hash += "/setup";
              }
            } else {
              // Remove /setup from hash if it exists
              if (window.location.hash.endsWith("/setup")) {
                window.location.hash = window.location.hash.replace("/setup", "");
              }
            }
          }} 
        />
      )}
      {!isAccount && !isSecurity && (
        <div className="flex items-center justify-center h-full text-zinc-500">
          Select a setting from the left
        </div>
      )}
    </SettingsDialog>
  );
}
