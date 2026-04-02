"use server";

import { SignupPayload } from "@/lib/schemas/auth.schema";

export async function registerUser(payload: SignupPayload) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_AUTH_API}/auth/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const body = await res.json();

    if (!res.ok) {
      return { success: false, error: body.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: { message: "Network error. Please check your connection." },
    };
  }
}
