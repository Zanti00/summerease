"use server";

import { cookies } from "next/headers";

const NEXT_PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function changePasswordAction(oldPassword: string, newPassword: string, logoutAll: boolean) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;

    if (!token) {
      return { success: false, error: { message: "Authentication required" } };
    }

    const response = await fetch(`${NEXT_PUBLIC_API_URL}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ oldPassword, newPassword, logoutAll }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        error: { 
          message: result.error?.message || result.message || result.detail || "Failed to change password" 
        } 
      };
    }

    if (result.success && result.data?.loggedOut) {
      // ✅ MANUALLY CLEAR THE COOKIES ON THE BROWSER
      cookieStore.delete("access_token");
      cookieStore.delete("refresh_token");
    }

    return result;
  } catch (error) {
    console.error("Change Password Error:", error);
    return {
      success: false,
      error: { message: "Network error during password change" },
    };
  }
}
