import type { ApiUser } from "./api";
import { fetchPrivate } from "./server-api";

/**
 * Reads the current reader on the server.
 *
 * The session cookie is HttpOnly, so a Server Component cannot see its value — but it
 * can forward it. That keeps the browser from ever holding a token, and keeps the
 * decision about who is authenticated in Spring rather than here.
 */
export async function getCurrentUser(): Promise<ApiUser | null> {
  // Identity is never cached; fetchPrivate forwards the session cookie and sets no-store.
  // An unreachable API is not the same as a signed-out reader, but from the page's point
  // of view there is nothing to render either way.
  return fetchPrivate<ApiUser>("/api/v1/me");
}
