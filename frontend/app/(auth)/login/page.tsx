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
import AuthLayout from "../layout";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      toast.success("Email verified. You may now login");
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault;
    console.log("test");
  }

  return (
    <AuthLayout>
      <Card className="p-6 mx-auto w-full max-w-md shadow-2xl">
        <form className="flex flex-col gap-2" onSubmit={handleLogin}>
          <Field>
            <FieldLabel>Email address</FieldLabel>
            <Input required type="email" placeholder="Enter your email"></Input>
            <FieldLabel>Password</FieldLabel>
            <Input
              required
              type="password"
              placeholder="Enter your password"
            ></Input>
          </Field>
          <Field orientation={"horizontal"}>
            <Checkbox
              id="remember-me-checkbox"
              name="remember-me-checkbox"
            ></Checkbox>
            <Label htmlFor="remember-me-checkbox">Remember me</Label>
          </Field>
          <div className="flex justify-end text-primary">
            <Link href={ROUTES.auth.forgotPassword}>
              <p>Forgot password?</p>
            </Link>
          </div>
          <Button className="w-full" type="submit">
            Log In
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
