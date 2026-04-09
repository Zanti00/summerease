"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft } from "lucide-react";
import { Field, FieldLabel } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import AuthLayout from "../../layout";
import { verifyMfa } from "@/lib/actions/mfaAction";
import { ROUTES } from "@/app/constants/routes";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

export default function MfaPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuth } = useAuth();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [backupCode, setBackupCode] = useState("");
  const [isBackupMode, setIsBackupMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const mfaToken = searchParams.get("mfaToken");

  useEffect(() => {
    const isMfaInProgress = sessionStorage.getItem("mfa_in_progress");
    if (!mfaToken || !isMfaInProgress) {
      router.push(ROUTES.auth.login);
    }
  }, [mfaToken, router]);

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const code = isBackupMode ? backupCode : otp.join("");
    
    if (!isBackupMode && code.length < 6) {
      setError("Please enter a 6-digit code.");
      return;
    }

    if (isBackupMode && !backupCode) {
      setError("Please enter your backup code.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await verifyMfa(code, mfaToken!);

      if (result.success) {
        toast.success("MFA Verified. Welcome back!");
        sessionStorage.removeItem("mfa_in_progress");
        if (result.data?.user) {
          setAuth(result.data.user);
        }
        router.push(ROUTES.documents.root);
      } else {
        setError(result.error?.message || "Invalid or expired MFA code.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="p-6 mx-auto w-full max-w-md shadow-2xl flex flex-col gap-6 bg-card/50 backdrop-blur-md border-ring/20">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Two-Factor Authentication</h1>
          <p className="text-sm text-muted-foreground">
            {isBackupMode 
              ? "Enter one of your recovery backup codes to continue." 
              : "Enter the security code from your authenticator app to continue."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && <FormError message={error} />}
          
          <div className="w-full space-y-4">
            <p className="text-sm font-medium text-zinc-300 text-center">
              {isBackupMode ? "Enter your backup code" : "Enter your 6-digit security code"}
            </p>
            
            {isBackupMode ? (
              <Input
                type="text"
                placeholder="Ex: ABCDE-FGHIJ"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                disabled={isSubmitting}
                className="h-14 text-center text-xl font-mono tracking-widest bg-zinc-800 border-zinc-700 focus:ring-primary focus:border-primary transition-all disabled:opacity-50"
                autoFocus
              />
            ) : (
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
                    disabled={isSubmitting}
                    className="w-12 h-14 text-center text-xl font-bold bg-zinc-800 border-zinc-700 focus:ring-primary focus:border-primary transition-all disabled:opacity-50"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 rounded-full font-bold text-base flex items-center justify-center gap-2" 
            disabled={isSubmitting || (isBackupMode ? !backupCode : otp.some(d => d === ""))}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Verifying..." : "Verify Code"}
          </Button>
        </form>

        <div className="text-center text-sm">
          {isBackupMode ? (
            <button 
              type="button"
              className="flex items-center justify-center gap-2 text-primary hover:underline font-medium mx-auto"
              onClick={() => {
                setIsBackupMode(false);
                setError(null);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to authenticator
            </button>
          ) : (
            <p className="text-muted-foreground">
              Lost access to your device?{" "}
              <span 
                className="text-primary cursor-pointer hover:underline font-medium" 
                onClick={() => {
                  setIsBackupMode(true);
                  setError(null);
                }}
              >
                Use a backup code
              </span>
            </p>
          )}
        </div>
      </Card>
    </AuthLayout>
  );
}
