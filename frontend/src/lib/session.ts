import { cookies } from "next/headers";
import { API_BASE, type ApiUser } from "./api";

/**
 * Reads the current reader on the server.
 *
 * The session cookie is HttpOnly, so a Server Component cannot see its value — but it
 * can forward it. That keeps the browser from ever holding a token, and keeps the
 * decision about who is authenticated in Spring rather than here.
 */
export async function getCurrentUser(): Promise<ApiUser | null> {
  // Without a configured API there is no one to ask, so nobody is authenticated.
  // The public pages still render; the auth pages report the failure honestly.
  if (!API_BASE) return null;

  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return null;

  try {
    const response = await fetch(`${API_BASE}/api/v1/me`, {
      headers: { cookie: cookieHeader, Accept: "application/json" },
      // Identity must never be served from a cache; it is per-request by definition.
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as ApiUser;
  } catch {
    // The API being unreachable is not the same as the reader being signed out, but
    // from the page's point of view there is nothing to render either way.
    return null;
  }
}
