import { cookies } from "next/headers";

/**
 * Server-side reads from the Spring API.
 *
 * These go direct to the API origin rather than through the public proxy: a Server
 * Component calling its own public URL would loop back through the edge for nothing.
 *
 * Server-only variable, deliberately not NEXT_PUBLIC_ — the browser must never address
 * the API host directly, or the session cookie stops being first-party.
 */
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:8080";

/**
 * How long a page waits for the API before giving up and rendering a "waking up" state.
 *
 * Render Free sleeps an idle service and takes tens of seconds to start it again. A page
 * that waits the whole time is a blank screen; a page that treats a slow first response
 * as "unavailable" tells a reader the product is broken when it is merely starting. So
 * the server waits briefly and hands the rest of the wait to the browser, which polls.
 *
 * Briefly means well inside a serverless function's own execution limit: at 8 s, a cold
 * start measured the waiting page arriving at 9.4 s, and a second one (on a freshly
 * deployed function) produced no page at all within 30 s. A warm API answers in well
 * under a second, so this bound only ever applies to one that is asleep.
 */
const REQUEST_TIMEOUT_MS = 4000;

/**
 * The three things a read can mean. Collapsing them into `null` is how a sleeping backend
 * turned into a 404 for a real book, and into a sign-out for a signed-in reader.
 */
export type Fetched<T> =
  | { kind: "ok"; data: T }
  /** The API answered: this resource does not exist, or the reader is not signed in. */
  | { kind: "absent"; status: number }
  /** The API did not answer usefully — asleep, starting, or failing. Not a verdict. */
  | { kind: "unavailable" };

async function read<T>(path: string, init: RequestInit & { next?: { revalidate: number } }): Promise<Fetched<T>> {
  try {
    const response = await fetch(`${API_ORIGIN}${path}`, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.ok) return { kind: "ok", data: (await response.json()) as T };
    // 4xx is an answer. 5xx, and gateway errors from a platform still waking the service,
    // are not.
    if (response.status >= 400 && response.status < 500) {
      return { kind: "absent", status: response.status };
    }
    return { kind: "unavailable" };
  } catch {
    // Timeout, refused connection, DNS — all "could not find out".
    return { kind: "unavailable" };
  }
}

/** Public catalogue data. Cacheable, and fetched without credentials. */
export function fetchPublicResult<T>(path: string, revalidateSeconds = 300) {
  return read<T>(path, {
    headers: { Accept: "application/json" },
    next: { revalidate: revalidateSeconds },
  });
}

/** The reader's own data. Forwards the session cookie; never cached. */
export async function fetchPrivateResult<T>(path: string): Promise<Fetched<T>> {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return { kind: "absent", status: 401 };
  return read<T>(path, {
    headers: { cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
}

/** Convenience for callers where "not available right now" and "absent" render alike. */
export async function fetchPublic<T>(path: string, revalidateSeconds = 300): Promise<T | null> {
  const result = await fetchPublicResult<T>(path, revalidateSeconds);
  return result.kind === "ok" ? result.data : null;
}

export async function fetchPrivate<T>(path: string): Promise<T | null> {
  const result = await fetchPrivateResult<T>(path);
  return result.kind === "ok" ? result.data : null;
}

/**
 * The catalogue's size, for pages that state it. Cached for an hour, matching the API's
 * own Cache-Control: the numbers only change when the offline ingest runs.
 */
export function fetchCatalogueStats() {
  return fetchPublic<import("./api").CatalogueStats>("/api/v1/catalogue/stats", 3600);
}
