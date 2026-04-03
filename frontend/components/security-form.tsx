"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MFASetupDialog } from "./mfa-setup-dialog";
import { MFADisableDialog } from "./mfa-disable-dialog";
import { useAuth } from "@/components/providers/auth-provider";

export function SecurityForm({
  onSetupOpenChange,
}: {
  onSetupOpenChange?: (open: boolean) => void;
}) {
  const { user, setAuth } = useAuth();
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isDisableOpen, setIsDisableOpen] = useState(false);

  // Synchronize internal state with user.mfa_enabled from context
  const isMFAEnabled = user?.mfa_enabled ?? false;

  const toggleSetup = (open: boolean) => {
    setIsSetupOpen(open);
    onSetupOpenChange?.(open);
  };

  const handleMFAToggle = (checked: boolean) => {
    if (checked) {
      toggleSetup(true);
    } else {
      setIsDisableOpen(true);
    }
  };

  const handleSetupComplete = () => {
    if (user) {
      setAuth({ ...user, mfa_enabled: true });
    }
    toggleSetup(false);
  };

  const handleDisableComplete = () => {
    if (user) {
      setAuth({ ...user, mfa_enabled: false });
    }
    setIsDisableOpen(false);
  };

  const handleSetupCancel = (open: boolean) => {
    toggleSetup(open);
  };

  return (
    <div className="space-y-12">
      {/* MFA Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-zinc-100">
          Multi-factor authentication (MFA)
        </h2>
        
        <div className="flex items-center justify-between py-4 group">
          <div className="space-y-1">
            <Label htmlFor="mfa-switch" className="text-zinc-100 font-semibold text-base cursor-pointer">
              Authenticator app
            </Label>
            <p className="text-sm text-zinc-400">
              Use one-time codes from an authenticator app.
            </p>
          </div>
          <Switch 
            id="mfa-switch"
            checked={isMFAEnabled} 
            onCheckedChange={handleMFAToggle} 
          />
        </div>
      </div>

      <MFASetupDialog 
        open={isSetupOpen} 
        onOpenChange={handleSetupCancel}
        onComplete={handleSetupComplete}
      />

      <MFADisableDialog
        open={isDisableOpen}
        onOpenChange={setIsDisableOpen}
        onComplete={handleDisableComplete}
      />

      {/* Password Section placeholder (for future) */}
      <div className="pt-8 border-t border-zinc-800 space-y-6">
        <h2 className="text-lg font-semibold text-zinc-100">Password</h2>
        <p className="text-sm text-zinc-400">
          Changing your password will log you out of all other sessions.
        </p>
      </div>
    </div>
  );
}
