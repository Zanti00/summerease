"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAuthCookie } from "@/lib/actions/authActions";
import { ROUTES } from "@/app/constants/routes";
import AuthLayout from "@/app/(auth)/layout";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const token = searchParams.get("token");
    const error = searchParams.get("error");

    async function handleAuth() {
      if (token) {
        try {
          await setAuthCookie(token);

          // Update global auth state
          // In a real scenario, you'd decode the token or fetch /me here
          setAuth({ id: "oauth", email: "checking..." });

          setTimeout(() => {
            router.push(ROUTES.documents.root);
          }, 800);
        } catch (err) {
          console.error("Failed to set auth cookie:", err);
          router.push(`${ROUTES.auth.login}?error=oauth_failed`);
        }
      } else if (error) {
        router.push(`${ROUTES.auth.login}?error=${error}`);
      } else {
        // No token or error, unexpected state
        router.push(ROUTES.auth.login);
      }
    }

    handleAuth();
  }, [searchParams, router, setAuth]);

  return (
    <AuthLayout>
      <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-card/50 backdrop-blur-xl border border-ring/20 shadow-2xl animate-in fade-in zoom-in duration-500">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <Loader2 className="w-12 h-12 text-primary animate-spin relative" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">
            Completing Sign In
          </h1>
          <p className="text-muted-foreground animate-pulse">
            Securely syncing your account...
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
