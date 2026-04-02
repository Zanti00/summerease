"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { LightWavesBackground } from "@/components/ui/light-waves";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ROUTES } from "@/app/constants/routes";
import AuthLayout from "../layout";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLoginForm } from "@/hooks/useLoginForm";
import { FormError } from "@/components/ui/form-error";
import { loginUser } from "@/lib/actions/signinAction";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
    };

    if (getCookie("verified_toast") === "true") {
      toast.success("Email verified. You may now login");

      document.cookie =
        "verified_toast=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
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
          result.error.details.forEach((issue: any) => {
            const field = issue.path[0];
            setError(field as any, { message: issue.message });
          });
          return;
        }

        // Handle general server errors
        setServerError(result.error?.message ?? "Something went wrong.");
        return;
      }
      router.push(ROUTES.documents.root);
    } catch (error: any) {
      setServerError(error.message || "An error occurred during login.");
    }
  });

  return (
    <AuthLayout>
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
        <Button className={"bg-border text-white"}>Google</Button>
        <div className="flex gap-1 justify-center">
          <p>Don&apos;t have an account?</p>
          <Link href={ROUTES.auth.register}>
            <span className="text-primary">Sign up</span>
          </Link>
        </div>
      </Card>
    </AuthLayout>
  );
}
