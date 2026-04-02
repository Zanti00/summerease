import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = ["/documents"];

const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];

export function middleware(request: NextRequest) {
  const currentUser = request.cookies.get("access_token")?.value;

  if (protectedRoutes.includes(request.nextUrl.pathname) && !currentUser) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (authRoutes.includes(request.nextUrl.pathname) && currentUser) {
    return NextResponse.redirect(new URL("/documents", request.url));
  }

  return NextResponse.next();
}
