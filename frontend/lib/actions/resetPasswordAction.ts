"use server";

import { API_BASE_URL } from "@/lib/apiConfig";

export async function resetPasswordAction(token: string, password: string) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/auth/reset-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      },
    );

    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, error: { message: "Network error" } };
  }
}
