import type { ApiUser } from "./api";
import { fetchPrivateResult } from "./server-api";

export type Session =
  | { kind: "signed-in"; user: ApiUser }
  | { kind: "signed-out" }
  /** The API could not be reached, so we do not know. Not the same as signed out. */
  | { kind: "unavailable" };

/**
 * Who the reader is, or that we cannot tell yet.
 *
 * Treating "the API is asleep" as "signed out" would bounce a signed-in reader to the
 * login page every time the free-tier backend wakes up.
 */
export async function getSession(): Promise<Session> {
  const result = await fetchPrivateResult<ApiUser>("/api/v1/me");
  if (result.kind === "ok") return { kind: "signed-in", user: result.data };
  if (result.kind === "absent") return { kind: "signed-out" };
  return { kind: "unavailable" };
}

/**
 * For pages where "unknown" may safely render as signed out — the landing and auth
 * pages, which only use this to skip ahead for a reader who is already signed in.
 */
export async function getCurrentUser(): Promise<ApiUser | null> {
  const session = await getSession();
  return session.kind === "signed-in" ? session.user : null;
}
