import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, createRemoteJWKSet } from "jose";

const protectedRoutes = ["/documents"];
const authRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

// Initialize JWKS with the public auth API URL or a fallback
const JWKS = createRemoteJWKSet(
  new URL(
    `${process.env.NEXT_PUBLIC_AUTH_API || "http://127.0.0.1:3001"}/auth/.well-known/jwks.json`,
  ),
);

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWKS);
    return { valid: true, payload };
  } catch (error: unknown) {
    const errorCode = (error as { code?: string }).code || "UNKNOWN_ERROR";
    return { valid: false, error: errorCode };
  }
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get("host") || "";

  // Enforce 127.0.0.1 over localhost to avoid session/origin issues
  // ONLY redirect if the 'host' header explicitly contains 'localhost'
  if (host.includes("localhost")) {
    url.hostname = "127.0.0.1";
    // We must ensure the port is preserved if specified in the Host header
    if (host.includes(":")) {
      url.port = host.split(":")[1];
    }
    return NextResponse.redirect(url);
  }

  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;
  const path = request.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.includes(path);
  const isAuthRoute = authRoutes.includes(path);

  if (accessToken) {
    const { valid, error } = await verifyToken(accessToken);

    if (valid) {
      if (isAuthRoute) {
        return NextResponse.redirect(new URL("/documents", request.url));
      }
      return NextResponse.next();
    }

    // Token is EXPIRED - Attempt Silent Refresh
    if (error === "ERR_JWT_EXPIRED") {
      if (refreshToken) {
        try {
          const refreshRes = await fetch(
            `${process.env.NEXT_PUBLIC_AUTH_API || "http://127.0.0.1:3001"}/auth/refresh`,
            {
              method: "POST",
              headers: {
                Cookie: `refresh_token=${refreshToken}`,
              },
            },
          );

          if (refreshRes.ok) {
            const result = await refreshRes.json();
            const newAccessToken = result.data?.accessToken;
            // The backend might also rotate the refresh token
            const newRefreshToken = result.data?.refreshToken;

            if (newAccessToken) {
              const response = isAuthRoute
                ? NextResponse.redirect(new URL("/documents", request.url))
                : NextResponse.next();

              const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax" as const,
                maxAge: 60 * 60 * 24 * 7,
                path: "/",
              };

              response.cookies.set(
                "access_token",
                newAccessToken,
                cookieOptions,
              );
              if (newRefreshToken) {
                response.cookies.set(
                  "refresh_token",
                  newRefreshToken,
                  cookieOptions,
                );
              }
              return response;
            }
          }
        } catch {}
      }
    }

    // SECURITY EVENT: Token is malformed, revoked, or refresh failed
    const loginUrl = new URL("/login", request.url);
    if (error === "ERR_JWT_EXPIRED") {
      loginUrl.searchParams.set("error", "session_expired");
    }

    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    response.cookies.delete("verified_toast");

    // Clear storage to prevent "ghost" data
    response.headers.set("Clear-Site-Data", '"cache", "cookies", "storage"');

    // Attempt to notify backend (best effort revocation)
    try {
      fetch(
        `${process.env.NEXT_PUBLIC_AUTH_API || "http://127.0.0.1:3001"}/auth/logout`,
        {
          method: "POST",
          headers: { Cookie: `access_token=${accessToken}` },
        },
      );
    } catch {}

    return response;
  }

  if (isProtectedRoute && !accessToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
