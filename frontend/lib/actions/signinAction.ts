"use server";

import { cookies } from "next/headers";
import { API_BASE_URL } from "@/lib/apiConfig";

export async function loginUser(email: string, password: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    const result = await response.json();

    if (result.success && result.data?.accessToken) {
      // MANUALLY SET THE COOKIE TO THE BROWSER
      const cookieStore = await cookies();
      cookieStore.set("access_token", result.data.accessToken, {
        httpOnly: true, // Security: prevents JS from reading it
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
      });
    }

    return result;
  } catch (error) {
    console.error("Login Error - Catch Block:", error);
    return { success: false, error: { message: "Network error" } };
  }
}
