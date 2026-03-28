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

export default function SignUpPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const waves = useMemo(
    () => ({
      colors: ["#ffea00", "#fbff41", "#fbffa7"],
      speed: 1.2,
      intensity: 0.5,
    }),
    [],
  );

  return (
    <div className="min-h-screen overflow-auto">
      <LightWavesBackground {...waves}>
        <div className="min-h-screen flex flex-col items-center justify-center">
          <main className="w-full max-w-md flex-1 flex items-center justify-center px-5">
            <Card className="p-6 mx-auto w-full max-w-md shadow-2xl">
              <Field>
                {currentIndex === 0 ? (
                  <div className="gap-3 flex flex-col">
                    <FieldLabel>Username</FieldLabel>
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                    ></Input>
                    <FieldLabel>Email</FieldLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                    ></Input>
                    <Button
                      onClick={() => {
                        setCurrentIndex(1);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                ) : (
                  <div className="gap-3 flex flex-col">
                    <FieldLabel>Password</FieldLabel>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                    ></Input>
                    <FieldLabel>Confirm Password</FieldLabel>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                    ></Input>
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setCurrentIndex(0)}
                      >
                        Back
                      </Button>
                      <Button className="flex-1">Register</Button>
                    </div>
                  </div>
                )}
              </Field>

              <div className="flex items-center gap-3">
                <hr className="flex-1 border-t border-ring" />
                <span className="text-xs uppercase text-ring">
                  or continue with
                </span>
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
          </main>
          <footer className="w-full py-3 text-center text-sm text-ring">
            <span>
              {" "}
              © {new Date().getFullYear()} SummerEase. All rights reserved.
            </span>
            <div className="flex gap-2 justify-center">
              <span>Terms of Services</span>
              <span>Privacy Policy</span>
            </div>
          </footer>
        </div>
      </LightWavesBackground>
    </div>
  );
}
