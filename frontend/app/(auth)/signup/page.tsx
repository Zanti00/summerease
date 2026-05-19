"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ROUTES } from "@/app/constants/routes";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { toast } from "sonner";

import { useSignupForm } from "@/hooks/useSignupForm";
import { SignupFormData, signupPayloadSchema } from "@/lib/schemas/auth.schema";
import { registerUser } from "@/lib/actions/signupAction";
import { FormError } from "@/components/ui/form-error";


function SignUpForm() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "oauth_failed") {
      toast.error("Google login failed. Please try again.");

      // Clean up URL to avoid showing toast on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    trigger,
  } = useSignupForm();

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);

    const payload = signupPayloadSchema.parse(data);

    const result = await registerUser(payload);

    if (!result.success) {
      // Handle specific validation errors just like before
      if (result.error?.code === "VALIDATION_ERROR" && result.error?.details) {
        result.error.details.forEach((issue: { path: (keyof SignupFormData)[]; message: string }) => {
          const field = issue.path[0];
          setError(field as keyof SignupFormData, { message: issue.message });
        });
        return;
      }

      // Handle general server errors
      setServerError(result.error?.message ?? "Something went wrong.");
      return;
    }

    // If successful
    setIsSuccess(true);
  });

  if (isSuccess) {
    return (
      <Card className="p-6 mx-auto w-full max-w-md shadow-2xl text-center py-10">
        <p className="text-lg font-semibold">Check your email!</p>{" "}
        <p className="text-muted-foreground text-sm mt-1">
          We sent a verification link to get you started.
        </p>
      </Card>
    );
  }

  return (

      <Card className="p-6 mx-auto w-full max-w-md shadow-2xl">
        <form onSubmit={onSubmit}>
          <Field>
            {currentIndex === 0 ? (
              <div key="step-0" className="gap-3 flex flex-col">
                <FieldLabel>Username</FieldLabel>
                <Input
                  type="text"
                  placeholder="Enter your username"
                  {...register("username")}
                ></Input>
                {errors.username && (
                  <p
                    id="firstName-error"
                    role="alert"
                    className="text-xs text-destructive"
                  >
                    {errors.username.message}
                  </p>
                )}
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  {...register("email")}
                ></Input>
                {errors.email && (
                  <p
                    id="lastName-error"
                    role="alert"
                    className="text-xs text-destructive"
                  >
                    {errors.email.message}
                  </p>
                )}
                <Button
                  type="button"
                  onClick={async () => {
                    const isValidStep = await trigger(["username", "email"]);
                    if (isValidStep) {
                      setCurrentIndex(1);
                    }
                  }}
                >
                  Next
                </Button>
              </div>
            ) : (
              <div key="step-1" className="gap-3 flex flex-col">
                <FieldLabel>Password</FieldLabel>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  {...register("password")}
                ></Input>
                {errors.password && (
                  <p
                    id="password-error"
                    role="alert"
                    className="text-xs text-destructive"
                  >
                    {errors.password.message}
                  </p>
                )}
                <FieldLabel>Confirm Password</FieldLabel>
                <Input
                  type="password"
                  placeholder="Confirm your password"
                  {...register("confirmPassword")}
                ></Input>
                {errors.confirmPassword && (
                  <p
                    id="confirmPassword-error"
                    role="alert"
                    className="text-xs text-destructive"
                  >
                    {errors.confirmPassword.message}
                  </p>
                )}
                <div className="flex gap-2 w-full">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    disabled={isSubmitting}
                    onClick={() => setCurrentIndex(0)}
                  >
                    Back
                  </Button>
                  <Button className="flex-1" type="submit">
                    {isSubmitting ? "Creating account…" : "Sign Up"}
                  </Button>
                </div>
              </div>
            )}
          </Field>
          {serverError && <FormError message={serverError} />}
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
          <p>Already have an account?</p>
          <Link href={ROUTES.auth.login}>
            <span className="text-primary">Sign in</span>
          </Link>
        </div>
      </Card>

  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpForm />
    </Suspense>
  );
}
