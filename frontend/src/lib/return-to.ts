/**
 * Validates a `returnTo` target.
 *
 * An attacker who can choose where login sends the reader afterwards has an open
 * redirect: a link that begins on our domain and ends on theirs, carrying our
 * credibility with it. So this is an allowlist, not a blocklist — anything that is not
 * unambiguously a path on this application is refused.
 *
 * Rejected, and why each one matters:
 *   https://evil.example    absolute URL to another origin
 *   //evil.example          protocol-relative; browsers treat it as absolute
 *   /\evil.example          backslash; several browsers normalise it to //
 *   \\evil.example          same, both characters
 *   javascript:alert(1)     scheme that executes rather than navigates
 *   /login                  would bounce the reader straight back into a loop
 */
const FALLBACK = "/home";

export function safeReturnTo(raw: string | null | undefined, fallback = FALLBACK): string {
  if (!raw) return fallback;

  let candidate = raw.trim();
  if (candidate === "") return fallback;

  // A percent-encoded target may hide any of the forms below. Decode before judging it;
  // malformed encoding is itself reason enough to refuse.
  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    return fallback;
  }

  // Control characters, including the tab/newline some parsers strip mid-scheme.
  if (/[\u0000-\u001f\u007f]/.test(candidate)) return fallback;

  // Must be a path. This single rule rejects every absolute and scheme-relative form.
  if (!candidate.startsWith("/")) return fallback;

  // Backslashes are normalised to forward slashes by some browsers, so `/\evil.example`
  // becomes `//evil.example` — an absolute URL — after our check would have passed.
  if (candidate.includes("\\")) return fallback;

  // Protocol-relative: `//host` is absolute to a browser despite starting with a slash.
  if (candidate.startsWith("//")) return fallback;

  // Never return to an auth screen; that is a loop, not a destination.
  if (/^\/(login|signup)(\/|\?|#|$)/.test(candidate)) return fallback;

  return candidate;
}

/** Builds a login link that remembers where the reader was trying to go. */
export function loginHref(returnTo: string): string {
  const safe = safeReturnTo(returnTo);
  return safe === FALLBACK ? "/login" : `/login?returnTo=${encodeURIComponent(safe)}`;
}
