"use server";

import { cookies } from "next/headers";

const NEXT_PUBLIC_AUTH_API =
  process.env.NEXT_PUBLIC_AUTH_API || "http://127.0.0.1:3001";

/**
 * Initiates the MFA enrollment process.
 * Returns the QR code URL, manual secret, and initial backup codes.
 */
export async function enrollMfa() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;

    if (!token) {
      return { success: false, error: { message: "Authentication required" } };
    }

    const response = await fetch(`${NEXT_PUBLIC_AUTH_API}/auth/mfa/enroll`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("MFA Enrollment Error:", error);
    return {
      success: false,
      error: { message: "Network error during enrollment" },
    };
  }
}

/**
 * Verifies the MFA token to finalize enablement or act as a login challenge.
 */
export async function verifyMfa(tokenValue: string) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("access_token")?.value;

    if (!authToken) {
      return { success: false, error: { message: "Authentication required" } };
    }

    const response = await fetch(`${NEXT_PUBLIC_AUTH_API}/auth/mfa/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: tokenValue }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("MFA Verification Error:", error);
    return {
      success: false,
      error: { message: "Network error during verification" },
    };
  }
}

/**
 * Disables MFA for the user's account.
 */
export async function disableMfa(tokenValue: string) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("access_token")?.value;

    if (!authToken) {
      return { success: false, error: { message: "Authentication required" } };
    }

    const response = await fetch(`${NEXT_PUBLIC_AUTH_API}/auth/mfa/disable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: tokenValue }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("MFA Disable Error:", error);
    return {
      success: false,
      error: { message: "Network error while disabling MFA" },
    };
  }
}
