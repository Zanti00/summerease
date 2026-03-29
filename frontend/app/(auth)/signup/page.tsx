"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { LightWavesBackground } from "@/components/ui/light-waves";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ROUTES } from "@/app/constants/routes";
import { useMemo, useState } from "react";
import AuthLayout from "../layout";
import { useSignupForm } from "@/hooks/useSignupForm";
import { signupPayloadSchema } from "@/lib/schemas/auth.schema";
import { registerUser } from "@/lib/actions/signupAction";

export default function SignUpPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const waves = useMemo(
    () => ({
      colors: ["#ffea00", "#fbff41", "#fbffa7"],
      speed: 1.2,
      intensity: 0.5,
    }),
    [],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid, touchedFields },
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

    // If successful
    setIsSuccess(true);
  });

  if (isSuccess) {
    return (
      <AuthLayout>
        <Card className="p-6 mx-auto w-full max-w-md shadow-2xl text-center py-10">
          <p className="text-lg font-semibold">Check your email!</p>{" "}
          <p className="text-muted-foreground text-sm mt-1">
            We sent a verification link to get you started.
          </p>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
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
          {serverError && (
            <p
              role="alert"
              className="text-sm text-destructive mt-4 text-center"
            >
              {serverError}
            </p>
          )}
        </form>

        <div className="flex items-center gap-3">
          <hr className="flex-1 border-t border-ring" />
          <span className="text-xs uppercase text-ring">or continue with</span>
          <hr className="flex-1 border-t border-ring" />
        </div>
        <Button className={"bg-border text-white"}>Google</Button>
        <div className="flex gap-1 justify-center">
          <p>Already have an account?</p>
          <Link href={ROUTES.auth.login}>
            <span className="text-primary">Sign in</span>
          </Link>
        </div>
      </Card>
    </AuthLayout>
  );
}
