// frontend/lib/api/auth.ts

const FASTAPI_URL =
  process.env.NEXT_PUBLIC_FASTAPI_URL ?? "http://localhost:8000";

// ── Types ────────────────────────────────────────────────────────────────────

export interface RegisterPayload {
  email: string;
  password: string;
  username?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthError {
  detail: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    // Try to parse JSON error response; fall back to status text
    try {
      const error: AuthError = await res.json();
      throw new Error(error.detail ?? "Something went wrong");
    } catch {
      throw new Error(`${res.status} ${res.statusText}`);
    }
  }
  return res.json();
}

// ── Auth calls ───────────────────────────────────────────────────────────────

export async function registerUser(payload: RegisterPayload) {
  const res = await fetch(`${FASTAPI_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ id: string; email: string; username: string }>(res);
}

export async function loginUser(email: string, password: string) {
  // FastAPI OAuth2PasswordRequestForm expects form data, not JSON
  const form = new URLSearchParams({ username: email, password });

  const res = await fetch(`${FASTAPI_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  return handleResponse<AuthTokens>(res);
}

export async function refreshAccessToken(refresh_token: string) {
  const res = await fetch(`${FASTAPI_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(refresh_token),
  });
  return handleResponse<{ access_token: string }>(res);
}
