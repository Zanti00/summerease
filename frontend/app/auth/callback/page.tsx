"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAuthCookie, getCurrentUser } from "@/lib/actions/authActions";
import { ROUTES } from "@/app/constants/routes";
import AuthLayout from "@/app/(auth)/layout";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

function AuthCallbackForm() {
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

          // Fetch the actual user profile to update context with real details (like google_id)
          const userResult = await getCurrentUser();
          if (userResult.success && userResult.data?.user) {
            setAuth(userResult.data.user);
          } else {
            setAuth({ id: "oauth", email: "checking..." });
          }

          setTimeout(() => {
            router.push(`${ROUTES.documents.root}?login=success`);
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

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthCallbackForm />
    </Suspense>
  );
}
