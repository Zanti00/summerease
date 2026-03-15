"use client";

import LightWavesBackground from "@/components/ui/light-waves";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  emailSchema,
  loginSchema,
  registerSchema,
} from "@/lib/validators/authSchema";
import { loginUser, registerUser } from "@/lib/api/auth";
import Link from "next/link";

// Errors now hold arrays so we can surface multiple messages per field
// (zodFieldErrors from flatten() already return string[]).
type LoginErrors = Partial<Record<"email" | "password", string[]>>;
type RegisterErrors = Partial<
  Record<"email" | "username" | "password" | "confirmPassword", string[]>
>;
type ForgotPasswordErrors = Partial<Record<"email", string[]>>;

type AuthMode = "signin" | "signup" | "forgot";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signUpStep, setSignUpStep] = useState(1);

  const [loginErrors, setLoginErrors] = useState<LoginErrors>({});
  const [registerErrors, setRegisterErrors] = useState<RegisterErrors>({});
  const [forgotErrors, setForgotErrors] = useState<ForgotPasswordErrors>({});

  const searchParams = useSearchParams();
  const router = useRouter();
  const mode: AuthMode =
    searchParams?.get("mode") === "signup"
      ? "signup"
      : searchParams?.get("mode") === "forgot"
        ? "forgot"
        : "signin";

  const waves = useMemo(
    () => ({
      colors: ["#ffea00", "#fbff41", "#fdffe7"],
      speed: 1.2,
      intensity: 0.5,
    }),
    [],
  );

  function handleNextStep() {
    const result = registerSchema.safeParse({
      username,
      email,
      password: "placeholder_skip", // password not collected yet; use a dummy that passes min(8)
      confirmPassword: "placeholder_skip",
    });

    // We only care about email/username errors at this step
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      // keep the arrays intact so all messages can be shown
      const stepOneErrors: RegisterErrors = {
        email: Array.isArray(flat.email)
          ? flat.email
          : flat.email
            ? [flat.email]
            : [],
        username: Array.isArray(flat.username)
          ? flat.username
          : flat.username
            ? [flat.username]
            : [],
      };

      if (stepOneErrors.email?.length || stepOneErrors.username?.length) {
        setRegisterErrors(stepOneErrors);
        return;
      }
    }

    setRegisterErrors({});
    setSignUpStep(2);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const result = loginSchema.safeParse({ email, password });

    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setLoginErrors({
        email: flat.email,
        password: flat.password,
      });
      return;
    }

    setLoginErrors({});

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = body?.error ?? "Login failed";
        setLoginErrors({ password: [message] });
        return;
      }

      router.push("/documents");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Login failed";
      setLoginErrors({ password: [message] });
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();

    const result = emailSchema.safeParse(email);
    if (!result.success) {
      const firstIssue = result.error.issues?.[0];
      setForgotErrors({
        email: [firstIssue?.message ?? "Invalid email"],
      });
      return;
    }

    setForgotErrors({});

    const apiBase =
      process.env.NEXT_PUBLIC_FASTAPI_URL ?? "http://localhost:8000";
    const res = await fetch(`${apiBase}/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: result.data }),
    });

    const data = await res.json();

    console.log(data);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    const result = registerSchema.safeParse({
      username,
      email,
      password,
      confirmPassword,
    });

    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      // normalize to arrays to avoid runtime map errors
      const normalize = (v: unknown): string[] =>
        Array.isArray(v) ? v : v ? [String(v)] : [];

      setRegisterErrors({
        email: normalize(flat.email),
        username: normalize(flat.username),
        password: normalize(flat.password),
        confirmPassword: normalize(flat.confirmPassword),
      });
      return;
    }

    setRegisterErrors({});

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword: _, ...payload } = result.data;
      const user = await registerUser(payload);
      console.log("Registered user:", user);

      // After successful registration, send users to sign in.
      router.push("/auth?mode=signin");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Registration failed";
      setRegisterErrors({ email: [message] });
    }
  }

  return (
    <div className="flex flex-col min-h-screen overflow-auto">
      {/* background canvas / effect */}
      <LightWavesBackground {...waves}>
        {/* container inside fixed background; flex column to position footer */}
        <div className="flex flex-col min-h-screen">
          <section className="flex items-center justify-center flex-1 p-6">
            <div className="flex flex-col items-center justify-center">
              <Card className="p-6 shadow-2xl w-90 bg-secondary-background">
                {mode === "signin" ? (
                  <div className="flex flex-col gap-4 text-primary-text">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex text-lg font-semibold">
                        Welcome Back
                      </div>
                      <div className="flex text-secondary-text">
                        Your AI document companion
                      </div>
                    </div>

                    {/* FORM START */}

                    <form
                      onSubmit={handleLogin}
                      className="flex flex-col gap-2"
                    >
                      <Field>
                        <FieldLabel className="text-xs">
                          Email Address
                        </FieldLabel>
                        <Input
                          className="border-none bg-third-background"
                          placeholder="Enter email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        ></Input>
                        {Array.isArray(loginErrors.email) &&
                          loginErrors.email.map((msg, idx) => (
                            <ul key={idx}>
                              <li className="text-xs text-red-500">{msg}</li>
                            </ul>
                          ))}
                        <FieldLabel className="text-xs">Password</FieldLabel>
                        <Input
                          className="border-none bg-third-background"
                          placeholder="Enter password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        ></Input>
                        {Array.isArray(loginErrors.password) &&
                          loginErrors.password.map((msg, idx) => (
                            <ul key={idx} className="list-disc list-inside">
                              <li className="text-xs text-red-500">{msg}</li>
                            </ul>
                          ))}
                        <div className="flex items-center gap-2">
                          <Checkbox id="remember-me" name="remember-me" />
                          <FieldLabel
                            htmlFor="remember-me"
                            className="text-secondary-text"
                          >
                            Remember me
                          </FieldLabel>
                        </div>
                      </Field>
                      <div
                        className="flex place-content-end text-primary-button cursor-pointer"
                        onClick={() => {
                          router.replace(`/auth?mode=forgot`);
                          setPassword("");
                          setLoginErrors({});
                          setForgotErrors({});
                        }}
                      >
                        Forgot password?
                      </div>
                      <Button type="submit" className="w-full">
                        Log In
                      </Button>
                    </form>

                    {/* FORM END */}

                    <div className="flex items-center my-6">
                      <div className="flex-1 h-px bg-gray-600" />
                      <span className="mx-3 text-xs tracking-wider uppercase text-secondary-text">
                        or continue with
                      </span>
                      <div className="flex-1 h-px bg-gray-600" />
                    </div>
                    <Button className="bg-green-300">Google</Button>
                    <div className="flex justify-center gap-1">
                      <span className="text-secondary-text">
                        Don&apos;t have an account?
                      </span>
                      <span
                        className="text-primary-button cursor-pointer"
                        onClick={() => {
                          router.replace(`/auth?mode=signup`);
                          setEmail("");
                          setPassword("");
                          setRegisterErrors({});
                        }}
                      >
                        Sign up
                      </span>
                    </div>
                  </div>
                ) : mode === "signup" ? (
                  <div className="flex flex-col gap-4 text-primary-text">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex text-lg font-semibold">Welcome</div>
                      <div className="flex text-secondary-text">
                        Enter your details to register
                      </div>
                    </div>
                    <form
                      onSubmit={handleRegister}
                      className="flex flex-col gap-4"
                    >
                      <Field>
                        {signUpStep === 1 ? (
                          <>
                            <FieldLabel className="text-xs">
                              Email Address
                            </FieldLabel>
                            <Input
                              className="border-none bg-third-background"
                              placeholder="Enter email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              type="email"
                              required
                            />
                            {Array.isArray(registerErrors.email) &&
                              registerErrors.email.map((msg, idx) => (
                                <p key={idx} className="text-xs text-red-500">
                                  {msg}
                                </p>
                              ))}
                            <FieldLabel className="text-xs">
                              Username
                            </FieldLabel>
                            <Input
                              className="border-none bg-third-background"
                              placeholder="Enter username"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              required
                            />
                            {Array.isArray(registerErrors.username) &&
                              registerErrors.username.map((msg, idx) => (
                                <p key={idx} className="text-xs text-red-500">
                                  {msg}
                                </p>
                              ))}
                          </>
                        ) : (
                          <>
                            <FieldLabel className="text-xs">
                              Password
                            </FieldLabel>
                            <Input
                              className="border-none bg-third-background"
                              placeholder="Enter password"
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                            />
                            {Array.isArray(registerErrors.password) &&
                              registerErrors.password.map((msg, idx) => (
                                <ul key={idx} className="list-disc list-inside">
                                  <li className="text-xs text-red-500">
                                    {msg}
                                  </li>
                                </ul>
                              ))}
                            <FieldLabel className="text-xs">
                              Confirm Password
                            </FieldLabel>
                            <Input
                              className="border-none bg-third-background"
                              placeholder="Confirm password"
                              type="password"
                              value={confirmPassword}
                              onChange={(e) =>
                                setConfirmPassword(e.target.value)
                              }
                              required
                            />
                            {Array.isArray(registerErrors.confirmPassword) &&
                              registerErrors.confirmPassword.map((msg, idx) => (
                                <p key={idx} className="text-xs text-red-500">
                                  {msg}
                                </p>
                              ))}
                          </>
                        )}
                      </Field>
                      <div className="flex gap-2 w-full">
                        {signUpStep === 2 && (
                          <Button
                            type="button"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => {
                              setPassword("");
                              setConfirmPassword("");
                              setSignUpStep(1);
                            }}
                          >
                            Back
                          </Button>
                        )}
                        <Button
                          type={signUpStep === 1 ? "button" : "submit"}
                          className="flex-1"
                          onClick={(e) => {
                            if (signUpStep === 1) {
                              e.preventDefault();
                              handleNextStep();
                            }
                          }}
                        >
                          {signUpStep === 1 ? "Next" : "Sign up"}
                        </Button>
                      </div>
                    </form>
                    <div className="flex items-center my-6">
                      <div className="flex-1 h-px bg-gray-600" />
                      <span className="mx-3 text-xs tracking-wider uppercase text-secondary-text">
                        or continue with
                      </span>
                      <div className="flex-1 h-px bg-gray-600" />
                    </div>
                    <Button className="bg-green-300">Google</Button>
                    <div className="flex justify-center gap-1">
                      <span className="text-secondary-text">
                        Already have an account?
                      </span>
                      <span
                        className="text-primary-button cursor-pointer"
                        onClick={() => {
                          router.replace(`/auth?mode=signin`);
                          setEmail("");
                          setUsername("");
                          setPassword("");
                          setConfirmPassword("");
                          setRegisterErrors({}); // clear validation on switch
                        }}
                      >
                        Sign in
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 text-primary-text">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex text-lg font-semibold">
                        Reset Password
                      </div>
                      <div className="flex text-secondary-text">
                        Enter your email to receive reset instructions
                      </div>
                    </div>

                    <form
                      onSubmit={handleForgotPassword}
                      className="flex flex-col gap-4"
                    >
                      <Field>
                        <FieldLabel className="text-xs">
                          Email Address
                        </FieldLabel>
                        <Input
                          className="border-none bg-third-background"
                          placeholder="Enter email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                        {Array.isArray(forgotErrors.email) &&
                          forgotErrors.email.map((msg, idx) => (
                            <p key={idx} className="text-xs text-red-500">
                              {msg}
                            </p>
                          ))}
                      </Field>
                      <Button className="w-full">Send reset link</Button>
                    </form>

                    <div className="flex justify-center gap-1">
                      <span className="text-secondary-text">
                        Remembered your password?
                      </span>
                      <span
                        className="text-primary-button cursor-pointer"
                        onClick={() => {
                          router.replace(`/auth?mode=signin`);
                          setPassword("");
                          setLoginErrors({});
                          setForgotErrors({});
                        }}
                      >
                        Sign in
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </section>

          <footer className="text-sm text-center text-third-text mt-auto py-4">
            <div>
              <span>
                © {new Date().getFullYear()} SummerEase. All rights reserved.
              </span>
              <div className="flex justify-center gap-2">
                <span>Terms of Service</span>
                <span>Privacy Policy</span>
              </div>
            </div>
          </footer>
        </div>
      </LightWavesBackground>
    </div>
  );
}
