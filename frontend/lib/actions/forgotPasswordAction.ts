"use server";

export async function forgotPasswordAction(email: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_AUTH_API}/auth/forgot-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      },
    );

    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, error: { message: "Network error" } };
  }
}
