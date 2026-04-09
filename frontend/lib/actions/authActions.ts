"use server";

import { cookies } from "next/headers";

/**
 * Server action to securely set the access token cookie.
 * This is used for both standard login and OAuth callbacks.
 */
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  
  cookieStore.set("access_token", token, {
    httpOnly: true, // Prevents client-side JS from reading the cookie
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 1 week (sync this with backend expiration)
    path: "/",
  });

  return { success: true };
}

/**
 * Server action to clear authentication cookies on logout or error.
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
  return { success: true };
}

/**
 * Server action to fetch the currently authenticated user's profile.
 * Leverages the httpOnly access_token cookie for authentication.
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    return { success: false, error: { message: "No session found" } };
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to fetch user session:", error);
    return { success: false, error: { message: "Internal server error" } };
  }
}
