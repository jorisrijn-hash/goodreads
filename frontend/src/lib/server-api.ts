import { cookies } from "next/headers";

/**
 * Server-side reads from the Spring API.
 *
 * These go **direct** to the API origin rather than through the public proxy. A Server
 * Component calling its own public URL would loop back through the edge for no reason;
 * this is a server talking to a server.
 *
 * Server-only variable. It is deliberately not NEXT_PUBLIC_ — the browser must never
 * address the API host directly, or the session cookie stops being first-party.
 */
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:8080";

/** Public catalogue data. Cacheable, and fetched without credentials. */
export async function fetchPublic<T>(
  path: string,
  revalidateSeconds = 300,
): Promise<T | null> {
  try {
    const response = await fetch(`${API_ORIGIN}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: revalidateSeconds },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    // A page with no catalogue renders its empty state; it does not crash.
    return null;
  }
}

/**
 * The reader's own data. Forwards the incoming session cookie and is never cached,
 * because it differs per reader by definition.
 */
export async function fetchPrivate<T>(path: string): Promise<T | null> {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return null;
  try {
    const response = await fetch(`${API_ORIGIN}${path}`, {
      headers: { cookie: cookieHeader, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
