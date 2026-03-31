import { z } from "zod";

const emailField = z
  .string({ error: "Email is required." })
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .toLowerCase()
  .trim();

const passwordField = z
  .string({ error: "Password is required." })
  .min(8, "Password must be at least 8 characters.")
  .max(50, "Password must not exceed 50 characters.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character.",
  );

const usernameField = (label: string) =>
  z
    .string({ error: `${label} is required.` })
    .min(1, `${label} is required.`)
    .max(64, `${label} must not exceed 64 characters.`)
    .trim();

export const signupSchema = z
  .object({
    username: usernameField("Username"),
    email: emailField,
    password: passwordField,
    confirmPassword: z.string({
      error: "Please confirm your password.",
    }),
    // agreeToTerms: z.literal(true, {
    //   errorMap: () => ({
    //     message: "You must agree to the terms and conditions.",
    //   }),
    // }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"], // targets the error to the correct field
  });

export type SignupFormData = z.infer<typeof signupSchema>;

//add these later on agreeToTerms: __,
export const signupPayloadSchema = signupSchema.transform(
  ({ confirmPassword: _, ...rest }) => rest,
);
export type SignupPayload = z.infer<typeof signupPayloadSchema>;

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

