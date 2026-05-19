"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ROUTES } from "@/app/constants/routes";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
import { toast } from "sonner";
import { useLoginForm } from "@/hooks/useLoginForm";
import { FormError } from "@/components/ui/form-error";
import { loginUser } from "@/lib/actions/signinAction";
import { useRouter } from "next/navigation";
import { LoginFormData } from "@/lib/schemas/auth.schema";
import { useAuth } from "@/components/providers/auth-provider";

function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuth();
  const handledSuccessToast = useRef(false);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "session_expired") {
      toast.error("Session expired. Log in again");

      // Clean up URL to avoid showing toast on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    } else if (errorParam === "oauth_failed") {
      toast.error("Google login failed. Please try again.");

      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  useEffect(() => {
    if (handledSuccessToast.current) return;

    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
    };

    const verifiedParam = searchParams.get("verified");
    const loggedOutParam = searchParams.get("loggedOut");
    const shouldShowVerifiedToast =
      verifiedParam === "true" || getCookie("verified_toast") === "true";
    const shouldShowLoggedOutToast = loggedOutParam === "true";

    if (shouldShowVerifiedToast || shouldShowLoggedOutToast) {
      handledSuccessToast.current = true;

      if (shouldShowVerifiedToast) {
        toast.success("Email verified. You may now log in");
      }

      const url = new URL(window.location.href);
      url.searchParams.delete("verified");
      url.searchParams.delete("loggedOut");
      window.history.replaceState({}, "", url.toString());

      document.cookie =
        "verified_toast=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

      if (shouldShowLoggedOutToast) {
        toast.success("You have been logged out");
      }
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useLoginForm();

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    try {
      const result = await loginUser(data.email, data.password);

      if (!result.success) {
        if (
          result.error?.code === "VALIDATION_ERROR" &&
          result.error?.details
        ) {
          result.error.details.forEach(
            (issue: { path: (keyof LoginFormData)[]; message: string }) => {
              const field = issue.path[0];
              setError(field, { message: issue.message });
            },
          );
          return;
        }

        // Handle general server errors
        setServerError(result.error?.message ?? "Something went wrong.");
        return;
      }

      // 🛡️ HANDLE MFA REDIRECT
      if (result.data?.mfaRequired && result.data?.mfaToken) {
        sessionStorage.setItem("mfa_in_progress", "true");
        router.push(`${ROUTES.auth.mfa}?mfaToken=${result.data.mfaToken}`);
        return;
      }

      // Update client-side auth state
      if (result.data?.user) {
        setAuth(result.data.user);
      }

      router.push(`${ROUTES.documents.root}?login=success`);
    } catch (error: unknown) {
      const err = error as Error;
      setServerError(err.message || "An error occurred during login.");
    }
  });

  return (

      <Card className="p-6 mx-auto w-full max-w-md shadow-2xl">
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          {serverError && <FormError message={serverError} />}
          <Field>
            <FieldLabel>Email address</FieldLabel>
            <Input
              {...register("email")}
              type="email"
              placeholder="Enter your email"
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </Field>

          <Field>
            <FieldLabel>Password</FieldLabel>
            <Input
              {...register("password")}
              type="password"
              placeholder="Enter your password"
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </Field>

          <div className="flex justify-end text-primary">
            <Link href={ROUTES.auth.forgotPassword}>
              <p>Forgot password?</p>
            </Link>
          </div>
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Log In"}
          </Button>
        </form>
        <div className="flex items-center gap-3">
          <hr className="flex-1 border-t border-ring" />
          <span className="text-xs uppercase text-ring">or continue with</span>
          <hr className="flex-1 border-t border-ring" />
        </div>
        <Button
          variant="outline"
          className="w-full gap-2 border-ring/50 hover:bg-secondary/50"
          onClick={() => {
            window.location.href = `${process.env.NEXT_PUBLIC_AUTH_API}/auth/google`;
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continue with Google
        </Button>
        <div className="flex gap-1 justify-center">
          <p>Don&apos;t have an account?</p>
          <Link href={ROUTES.auth.register}>
            <span className="text-primary">Sign up</span>
          </Link>
        </div>
      </Card>

  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
