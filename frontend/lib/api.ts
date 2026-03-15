async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`/api/proxy${endpoint}`, {
    ...options,
    credentials: "include", // sends cookies automatically
  });

  if (res.status === 401) {
    // Try to refresh
    const refreshed = await fetch("/api/auth/refresh", { method: "POST" });
    if (!refreshed.ok) {
      window.location.href = "/login";
      return;
    }
    // Retry original request once
    return fetch(`/api/proxy${endpoint}`, {
      ...options,
      credentials: "include",
    });
  }

  return res;
}
