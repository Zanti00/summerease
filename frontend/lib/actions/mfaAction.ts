"use server";

import { cookies } from "next/headers";
import { API_BASE_URL } from "@/lib/apiConfig";

export async function verifyMfa(code: string, mfaToken: string) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/auth/mfa/verify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code, mfaToken }),
        credentials: "include",
      },
    );

    const result = await response.json();

    if (result.success && result.data?.accessToken) {
      const cookieStore = await cookies();
      
      // Set Access Token
      cookieStore.set("access_token", result.data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
      });

      // Note: The backend sets refresh_token in a cookie. 
      // In a server action, if we want to pass it through, we'd need to parse the Set-Cookie header.
      // For now, we follow the pattern in signinAction.ts and rely on the access_token.
    }

    return result;
  } catch (error) {
    console.error("MFA Verification Error:", error);
    return { success: false, error: { message: "Network error" } };
  }
}
