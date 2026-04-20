import { getToken, clearSession } from "./auth";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  // Always advertise JSON so Laravel returns JSON (not an HTML redirect) on auth errors.
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  // If the token is stale/invalid, scrub the session and bounce to login so the
  // app never sits in a "user object present but every API call 401s" zombie state.
  if (res.status === 401 && !path.startsWith("/auth/login")) {
    clearSession();
    if (typeof window !== "undefined") {
      const m = window.location.pathname.match(/^\/([a-z]{2}(?:-[A-Z]{2})?)(?=\/|$)/);
      const locale = m ? m[1] : "en";
      window.location.replace(`/${locale}/login`);
    }
  }

  if (!res.ok) {
    const msg = (body && (body.message || body.error)) || `HTTP ${res.status}`;
    throw new ApiError(res.status, body, msg);
  }
  return body as T;
}

export const swrFetcher = <T>(path: string) => apiFetch<T>(path);
