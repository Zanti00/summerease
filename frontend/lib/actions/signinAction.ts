"use server";

import { success } from "zod";
import { cookies } from "next/headers";

export async function loginUser(email: string, password: string) {
  try {
    const response = await fetch(`${process.env.API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    const result = await response.json();

    // if (result.success) {
    //   const { accessToken, user } = result.data;

    //   localStorage.setItem("access_token", accessToken);
    //   console.log("Login successful!", user);
    // } else {
    //   console.error("Login failed:", result.message);
    // }

    if (result.success && result.data?.accessToken) {
      // ✅ MANUALLY SET THE COOKIE TO THE BROWSER
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
    return { success: false, error: { message: "Network error" } };
  }
}
