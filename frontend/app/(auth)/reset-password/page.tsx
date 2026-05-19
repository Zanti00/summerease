"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/app/constants/routes";
import { useState, Suspense } from "react";
import { toast } from "sonner";
import { useResetPasswordForm } from "@/hooks/useResetPasswordForm";
import { FormError } from "@/components/ui/form-error";
import { resetPasswordAction } from "@/lib/actions/resetPasswordAction";
import { useRouter, useSearchParams } from "next/navigation";


function ResetPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useResetPasswordForm();

  if (!token) {
    return (
      <div className="text-center">
        <FormError message="Invalid or missing reset token." />
        <Button
          className="mt-4"
          onClick={() => router.push(`/${ROUTES.auth.forgotPassword}`)}
        >
          Request new link
        </Button>
      </div>
    );
  }

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    try {
      const result = await resetPasswordAction(token, data.password);

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

        setServerError(result.error?.message ?? "Something went wrong.");
        return;
      }

      toast.success("Password reset successful! You can now log in.");
      router.push(`/${ROUTES.auth.login}`);
    } catch (error: any) {
      setServerError(error.message || "An error occurred.");
    }
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      {serverError && <FormError message={serverError} />}
      <Field>
        <FieldLabel>New Password</FieldLabel>
        <Input
          {...register("password")}
          type="password"
          placeholder="Enter new password"
          aria-invalid={!!errors.password}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </Field>

      <Field>
        <FieldLabel>Confirm Password</FieldLabel>
        <Input
          {...register("confirmPassword")}
          type="password"
          placeholder="Confirm your password"
          aria-invalid={!!errors.confirmPassword}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </Field>

      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Resetting..." : "Reset Password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (

      <Card className="p-6 mx-auto w-full max-w-md shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-muted-foreground text-sm">
            Enter your new password below.
          </p>
        </div>
        
        <Suspense fallback={<div>Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </Card>

  );
}
