"use server";

import { cookies } from "next/headers";

const NEXT_PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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

    const response = await fetch(`${NEXT_PUBLIC_API_URL}/auth/mfa/enroll`, {
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
 * Verifies the MFA token to finalize enrollment.
 * Uses the dedicated /enroll/verify endpoint.
 */
export async function verifyEnrollMfa(tokenValue: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;

    if (!token) {
      return { success: false, error: { message: "Authentication required" } };
    }

    const response = await fetch(
      `${NEXT_PUBLIC_API_URL}/auth/mfa/enroll/verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: tokenValue }),
      },
    );

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("MFA Enrollment Verification Error:", error);
    return {
      success: false,
      error: { message: "Network error during enrollment verification" },
    };
  }
}

/**
 * Verifies the MFA token to act as a login challenge.
 */
export async function verifyMfa(tokenValue: string) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("access_token")?.value;

    // NOTE: For login challenge, we might not have a session cookie yet if MFA is required before login completes.
    // However, the current signinAction sets the cookie AFTER login success.
    // If LexNexus requires a token for verify, it should be passed in the request body.

    const response = await fetch(`${NEXT_PUBLIC_API_URL}/auth/mfa/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ token: tokenValue }), // Aligning with NexusAuth schema
      // NOTE: verifyMfa assumes mfa_token is handled. In the existing code, only 'token' was sent.
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

    const response = await fetch(`${NEXT_PUBLIC_API_URL}/auth/mfa/disable`, {
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
