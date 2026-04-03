"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Loader2, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { mfaService } from "@/services/mfa.service";

interface MFADisableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function MFADisableDialog({
  open,
  onOpenChange,
  onComplete,
}: MFADisableDialogProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleDisable = async () => {
    setIsLoading(true);
    const token = otp.join("");
    try {
      const result = await mfaService.disable(token);
      if (result.success) {
        toast.success("MFA has been disabled");
        onComplete();
        onOpenChange(false);
      } else {
        toast.error(result.error?.message || "Failed to disable MFA. Check your code.");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setOtp(["", "", "", "", "", ""]);
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        if (!isOpen) resetState();
        onOpenChange(isOpen);
      }}
    >
      <DialogPortal>
        <DialogOverlay className="bg-black/40 backdrop-blur-sm" />
        <DialogContent className="max-w-md bg-zinc-900 border-none text-zinc-100 p-6 flex flex-col gap-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="p-2 w-9 h-9 flex items-center justify-center bg-zinc-800 rounded-full text-zinc-400">
                <ShieldOff className="h-5 w-5" />
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-all"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <DialogTitle className="text-xl font-bold mt-2">
              Disable Authenticator App
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              To disable MFA, please enter a 6-digit code from your authenticator app.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8">
            <div className="w-full space-y-4">
              <div className="flex justify-between gap-2 px-2">
                {otp.map((digit, i) => (
                  <Input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={isLoading}
                    className="w-12 h-14 text-center text-xl font-bold bg-zinc-800 border-zinc-700 focus:ring-red-500 focus:border-red-500 transition-all disabled:opacity-50"
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="destructive"
                disabled={otp.some((d) => d === "") || isLoading}
                onClick={handleDisable}
                className="w-full h-12 rounded-full font-bold text-base flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? "Disabling..." : "Confirm Disable"}
              </Button>
              <Button
                variant="ghost"
                disabled={isLoading}
                onClick={() => onOpenChange(false)}
                className="w-full h-12 rounded-full font-medium text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
