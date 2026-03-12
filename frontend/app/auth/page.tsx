"use client";

import LightWavesBackground from "@/components/ui/light-waves";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { useMemo, useState, useEffect, useActionState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { loginSchema, registerSchema } from "@/lib/validators/authSchema";
import { register } from "@/lib/validators/authSchemaHelpers";

// Errors now hold arrays so we can surface multiple messages per field
// (zodFieldErrors from flatten() already return string[]).
type LoginErrors = Partial<Record<"email" | "password", string[]>>;
type RegisterErrors = Partial<
  Record<"email" | "username" | "password" | "confirmPassword", string[]>
>;

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signUpStep, setSignUpStep] = useState(1);

  const [loginErrors, setLoginErrors] = useState<LoginErrors>({});
  const [registerErrors, setRegisterErrors] = useState<RegisterErrors>({});

  const searchParams = useSearchParams();
  const router = useRouter();
  const initialMode =
    searchParams?.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);

  // keep state in sync if query changes (e.g. user manually edits URL)
  useEffect(() => {
    const m = searchParams?.get("mode");
    if (m === "signup" && mode !== "signup") setMode("signup");
    if (m === "signin" && mode !== "signin") setMode("signin");
  }, [searchParams]);

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

    const res = await fetch("http://localhost:8000/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(result.data),
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

    const { confirmPassword: _, ...payload } = result.data;

    const res = await fetch("http://localhost:8000/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(result.data),
    });

    const data = await res.json();

    console.log(data);
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
                            <ul>
                              <li key={idx} className="text-xs text-red-500">
                                {msg}
                              </li>
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
                            <ul className="list-disc list-inside">
                              <li key={idx} className="text-xs text-red-500">
                                {msg}
                              </li>
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
                      <div className="flex place-content-end text-primary-button">
                        Forgot password?
                      </div>
                      <Button className="w-full">Log In</Button>
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
                          const newMode =
                            mode === "signin" ? "signup" : "signin";
                          setMode(newMode);
                          router.replace(`/auth?mode=${newMode}`);
                          setEmail("");
                          setPassword("");
                          setRegisterErrors({});
                        }}
                      >
                        Sign up
                      </span>
                    </div>
                  </div>
                ) : (
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
                                <ul className="list-disc list-inside">
                                  <li
                                    key={idx}
                                    className="text-xs text-red-500"
                                  >
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
                          onClick={() => {
                            if (signUpStep === 1) setSignUpStep(2);
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
                          setMode(mode === "signup" ? "signin" : "signup");
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
