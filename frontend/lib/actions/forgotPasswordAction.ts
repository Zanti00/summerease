"use server";

export async function forgotPasswordAction(email: string) {
  try {
    const response = await fetch(
      `${process.env.API_URL}/auth/forgot-password`,
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
