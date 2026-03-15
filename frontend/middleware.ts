// middleware.ts (runs at the edge, before every request)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED_ROUTES = ["/dashboard", "/documents", "/profile"];
const PUBLIC_KEY = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(req: NextRequest) {
  const isAuthPage = req.nextUrl.pathname.startsWith("/auth");
  const isProtected = PROTECTED_ROUTES.some((path) =>
    req.nextUrl.pathname.startsWith(path),
  );

  const token = req.cookies.get("access_token")?.value;

  // If the user is already authenticated, prevent them from visiting the auth pages.
  if (isAuthPage && token) {
    try {
      await jwtVerify(token, PUBLIC_KEY);
      return NextResponse.redirect(new URL("/documents", req.url));
    } catch {
      // token invalid / expired, continue to auth page
    }
  }

  if (!isProtected) return NextResponse.next();

  if (!token)
    return NextResponse.redirect(new URL("/auth?mode=signin", req.url));

  try {
    await jwtVerify(token, PUBLIC_KEY);
    return NextResponse.next();
  } catch {
    // Token expired or invalid — send user back to sign in
    return NextResponse.redirect(new URL("/auth?mode=signin", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next|api|login|register).*)"],
};
