"use client";

import { useState, useRef, useEffect } from "react";
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
import { QrCode, Copy, Download, ChevronLeft, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { mfaService } from "@/services/mfa.service";

interface MFASetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

// Mock data removed in favor of service-provided recovery codes

export function MFASetupDialog({
  open,
  onOpenChange,
  onComplete,
}: MFASetupDialogProps) {
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isSecured, setIsSecured] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [enrollData, setEnrollData] = useState<{ qrCodeUrl: string; secret: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when opening without triggering cascading renders in effect body
  if (open && !prevOpen) {
    setPrevOpen(true);
    setStep(1);
    setOtp(["", "", "", "", "", ""]);
    setIsSecured(false);
    setEnrollData(null);
    setRecoveryCodes([]);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Fetch enrollment data when Step 1 is reached
  useEffect(() => {
    if (open && step === 1 && !enrollData && !isLoading) {
      const fetchEnrollment = async () => {
        setIsLoading(true);
        try {
          const result = await mfaService.enroll();
          if (result.success) {
            setEnrollData({
              qrCodeUrl: result.data.qrCodeUrl,
              secret: result.data.secret,
            });
            // Backup codes might also be sent here optionally, but verify returns them too
          } else {
            console.error("MFA Enrollment Error:", result.error);
            toast.error(result.error?.message || "Failed to start MFA enrollment");
            // onOpenChange(false); // Don't auto-close, let user see state
          }
        } catch (error) {
          console.error("MFA Enrollment Fetch Exception:", error);
          toast.error("An unexpected error occurred");
          // onOpenChange(false); // Don't auto-close
        } finally {
          setIsLoading(false);
        }
      };
      fetchEnrollment();
    }
  }, [open, step, enrollData, isLoading, onOpenChange]);

  const handleVerify = async () => {
    setIsLoading(true);
    const token = otp.join("");
    try {
      const result = await mfaService.verify(token);
      if (result.success) {
        setRecoveryCodes(result.data.backupCodes || []);
        setStep(3);
        toast.success("MFA verified successfully!");
      } else {
        toast.error(result.error?.message || "Invalid verification code");
      }
    } catch {
      toast.error("Failed to verify code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1]; // Only last digit
    if (!/^\d*$/.test(value)) return; // Only numbers

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next
    if (value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    toast.success("Recovery codes copied to clipboard");
    setIsSecured(true);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([recoveryCodes.join("\n")], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "summerease-recovery-codes.txt";
    document.body.appendChild(element);
    element.click();
    toast.success("Recovery codes downloaded");
    setIsSecured(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal={true}>
      <DialogPortal>
        <DialogOverlay className="bg-black/40 backdrop-blur-sm" />
        <DialogContent className="max-w-md bg-zinc-900 border-none text-zinc-100 p-6 flex flex-col gap-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              {step > 1 && step !== 3 ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setStep(step - 1);
                  }}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-all"
                  title="Go back"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : (
                <div className="w-9 h-9" /> // Placeholder to maintain centered title
              )}

              {step !== 3 ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenChange(false);
                  }}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-all"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              ) : (
                <div className="w-9 h-9" /> // Placeholder for Step 3
              )}
            </div>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 mt-2">
              {step === 1 && "Setup Authenticator App"}
              {step === 2 && "Enter Verification Code"}
              {step === 3 && "Save Recovery Codes"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {step === 1 &&
                "Scan this QR code with your authenticator app (like Google Authenticator or 1Password)."}
              {step === 2 &&
                "Enter the 6-digit code shown in your app to confirm setup."}
              {step === 3 &&
                "Save these backup codes somewhere safe. Each can only be used once. You won't see them again."}
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-8 flex flex-col items-center">
              {/* QR Code */}
              <div className="w-48 h-48 bg-white rounded-xl p-4 flex items-center justify-center relative">
                {isLoading && !enrollData ? (
                  <Loader2 className="h-8 w-8 text-zinc-400 animate-spin" />
                ) : enrollData?.qrCodeUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={enrollData.qrCodeUrl} 
                    alt="MFA QR Code" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <QrCode className="w-full h-full text-zinc-900" />
                )}
              </div>

              <div className="w-full space-y-3">
                <p className="text-sm font-medium text-zinc-300">
                  Can&apos;t scan? Enter this code manually:
                </p>
                <div className="relative">
                  <Input
                    readOnly
                    value={enrollData?.secret || "Loading..."}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 font-mono text-center tracking-widest h-12"
                  />
                </div>
              </div>

              <Button
                disabled={!enrollData || isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  setStep(2);
                }}
                className="w-full h-12 rounded-full font-bold text-base bg-white text-black hover:bg-zinc-200"
              >
                Next
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div className="w-full space-y-4">
                <p className="text-sm font-medium text-zinc-300 text-center">
                  Enter your 6-digit code
                </p>
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
                      className="w-12 h-14 text-center text-xl font-bold bg-zinc-800 border-zinc-700 focus:ring-primary focus:border-primary transition-all disabled:opacity-50"
                    />
                  ))}
                </div>
              </div>

              <Button
                disabled={otp.some((d) => d === "") || isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleVerify();
                }}
                className="w-full h-12 rounded-full font-bold text-base flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? "Verifying..." : "Confirm"}
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              {/* Recovery Codes Grid */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-zinc-800/50 rounded-xl border border-zinc-800">
                {recoveryCodes.map((code, i) => (
                  <div
                    key={i}
                    className="text-center font-mono text-sm tracking-widest text-zinc-300 py-1"
                  >
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={handleCopy}
                  className="flex-1 rounded-full gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700"
                >
                  <Copy className="h-4 w-4" />
                  Copy all
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleDownload}
                  className="flex-1 rounded-full gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>

              <Button
                disabled={!isSecured}
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete();
                  onOpenChange(false);
                }}
                className={cn(
                  "w-full h-12 rounded-full font-bold text-base transition-all",
                  isSecured
                    ? "bg-white text-black hover:bg-zinc-200"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed",
                )}
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
