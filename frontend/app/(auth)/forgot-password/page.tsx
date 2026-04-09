"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ROUTES } from "@/app/constants/routes";
import { useState } from "react";
import { toast } from "sonner";
import { useForgotPasswordForm } from "@/hooks/useForgotPasswordForm";
import { FormError } from "@/components/ui/form-error";
import { forgotPasswordAction } from "@/lib/actions/forgotPasswordAction";
import AuthLayout from "../layout";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForgotPasswordForm();

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    try {
      const result = await forgotPasswordAction(data.email);

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
      
      toast.success("Recovery email sent! Please check your inbox.");
      router.push(`/${ROUTES.auth.login}`);
    } catch (error: any) {
      setServerError(error.message || "An error occurred.");
    }
  });

  return (
    <AuthLayout>
      <Card className="p-6 mx-auto w-full max-w-md shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Forgot Password</h1>
          <p className="text-muted-foreground text-sm">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

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

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link href={`/${ROUTES.auth.login}`}>
            <span className="text-primary hover:underline">Back to Login</span>
          </Link>
        </div>
      </Card>
    </AuthLayout>
  );
}
