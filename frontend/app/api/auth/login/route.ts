import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/lib/api/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  try {
    const tokens = await loginUser(email, password);

    const response = NextResponse.json({ success: true });

    response.cookies.set("access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 15, // 15 min
      path: "/",
    });
    response.cookies.set("refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
