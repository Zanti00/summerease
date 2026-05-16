"use server";

import { cookies } from "next/headers";
import { API_BASE_URL } from "@/lib/apiConfig";

export async function logoutUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    const allCookies = cookieStore.toString();

    if (!token) {
      console.warn(
        "No access_token found in cookies, skipping backend logout.",
      );
      return { success: true }; // Consider it a success if we're already logged out
    }

    const response = await fetch(
      `${API_BASE_URL}/auth/logout`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: allCookies, // Manually forward cookies for server-side fetch
        },
        credentials: "include",
      },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error("Backend logout error:", response.status, result);
    }

    if (result.success) {
      // ✅ CLEAR THE COOKIE
      cookieStore.delete("access_token");
    }

    return result;
  } catch (error) {
    console.error("Logout error:", error);
    return {
      success: false,
      error: { message: "Network error during logout" },
    };
  }
}
