"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MFASetupDialog } from "./mfa-setup-dialog";
import { MFADisableDialog } from "./mfa-disable-dialog";
import { useAuth } from "@/components/providers/auth-provider";

export function SecurityForm({
  onSetupOpenChange,
}: {
  onSetupOpenChange?: (open: boolean) => void;
}) {
  const { user, setAuth, isLoading } = useAuth();
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isDisableOpen, setIsDisableOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read mfa_enabled from the authenticated user. If true, switch is on. If false or otherwise, it's off.
  const isMFAEnabled = user?.mfa_enabled === true;

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
        <h2 className="text-xl font-bold text-black">
          Multi-factor authentication (MFA)
        </h2>

        <div className="flex items-center justify-between py-4 group">
          <div className="space-y-1">
            <Label
              htmlFor="mfa-switch"
              className="text-black font-semibold text-base cursor-pointer"
            >
              Authenticator app
            </Label>
            <p className="text-sm text-zinc-600">
              Use one-time codes from an authenticator app.
            </p>
          </div>
          <Switch
            id="mfa-switch"
            checked={isMFAEnabled}
            onCheckedChange={handleMFAToggle}
            disabled={isLoading}
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

      {/* Password Section */}
      <div className="pt-8 border-t border-zinc-200 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-black">
            Change Password
          </h2>
          <p className="text-sm text-zinc-600">
            Secure your account by updating your password.
          </p>
        </div>

        <form
          className="space-y-4 max-w-md"
          onSubmit={async (e) => {
            e.preventDefault();
            setIsSubmitting(true);
            try {
              const formData = new FormData(e.currentTarget);
              const oldPassword = formData.get("oldPassword") as string;
              const newPassword = formData.get("newPassword") as string;
              const logoutAll = formData.get("logoutAll") === "on";

              if (!oldPassword || !newPassword) {
                toast.error("Please fill in all password fields.");
                return;
              }

              if (oldPassword === newPassword) {
                toast.error(
                  "New password cannot be the same as the current password.",
                );
                return;
              }

              const { changePasswordAction } =
                await import("@/lib/actions/securityActions");
              const result = await changePasswordAction(
                oldPassword,
                newPassword,
                logoutAll,
              );

              if (result.success) {
                toast.success(
                  "Password updated successfully. Logging you out...",
                );

                if (result.data?.loggedOut) {
                  // If they logged out of all devices, wait a moment then redirect to login
                  setTimeout(() => {
                    window.location.href = "/login";
                  }, 2000);
                } else {
                  (e.target as HTMLFormElement).reset();
                }
              } else {
                toast.error(
                  result.error?.message || "Failed to change password.",
                );
              }
            } catch (error) {
              console.error("Password change error:", error);
              toast.error("An unexpected error occurred.");
            } finally {
              setIsSubmitting(false);
            }
          }}
          id="change-password-form"
        >
          <div className="space-y-2">
            <Label htmlFor="oldPassword">Current Password</Label>
            <Input
              id="oldPassword"
              name="oldPassword"
              type="password"
              required
              className="bg-white border-zinc-300 text-black"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={8}
              className="bg-white border-zinc-300 text-black"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="logoutAll"
              name="logoutAll"
              defaultChecked
              className="w-4 h-4 rounded border-zinc-300 text-primary focus:ring-primary bg-white cursor-pointer"
            />
            <Label
              htmlFor="logoutAll"
              className="text-sm font-normal cursor-pointer text-black"
            >
              Log out of all other devices
            </Label>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 bg-black text-white hover:bg-zinc-800 font-semibold disabled:opacity-70 disabled:cursor-not-allowed min-w-[140px] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
