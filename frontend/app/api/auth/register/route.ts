// frontend/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/api/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const user = await registerUser(body);
    return NextResponse.json(user, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
