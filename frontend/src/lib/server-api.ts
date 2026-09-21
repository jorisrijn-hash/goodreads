import { cookies } from "next/headers";
import { API_BASE } from "./api";

/**
 * Server-side reads from the Spring API.
 *
 * Public data is fetched without credentials and may be cached; anything under
 * /api/v1/me forwards the reader's cookie and is never cached, because it is different
 * for every reader by definition.
 */
export async function fetchPublic<T>(
  path: string,
  revalidateSeconds = 300,
): Promise<T | null> {
  if (!API_BASE) return null;
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: revalidateSeconds },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchPrivate<T>(path: string): Promise<T | null> {
  if (!API_BASE) return null;
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return null;
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { cookie: cookieHeader, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
