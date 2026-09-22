/**
 * What the sign-in screens know about a submission in flight, and what they say about it.
 *
 * The API runs on a free host that sleeps when idle and can take minutes to start. A
 * button that just says "Working…" for that long looks broken, so the wording follows the
 * elapsed time and what we actually know: whether the API has answered anything yet.
 * There are no percentages, because nobody can know how far a cold start has got.
 */

export type AuthKind = "login" | "signup" | "demo";

export type PendingCopy = {
  /** The button's label. */
  button: string;
  /** A supporting line under the button, or null. */
  detail: string | null;
};

const FIRST = { login: "Signing in…", signup: "Creating account…", demo: "Opening demo…" } as const;
const STILL = { login: "Still signing in…", signup: "Still creating your account…", demo: "Still opening the demo…" } as const;
const CHECK = { login: "Checking your account.", signup: "Setting up your library.", demo: "Preparing the demo account." } as const;
const WAKING = { login: "Signing in…", signup: "Creating account…", demo: "Preparing the demo…" } as const;
const KEEP_OPEN = {
  login: "Your sign-in is still in progress. Keep this page open.",
  signup: "Your account is still being created. Keep this page open.",
  demo: "The demo is still being prepared. Keep this page open.",
} as const;

/**
 * The words for a submission that has been pending for `elapsed` ms.
 *
 * `waking` is true while the API has not yet answered even the lightweight token request
 * the page makes on arrival: then the wait is the server starting, and we say so in the
 * product's own words ("the demo server", never the hosting provider).
 */
export function pendingCopy(kind: AuthKind, elapsed: number, waking: boolean): PendingCopy {
  if (elapsed < 800) return { button: FIRST[kind], detail: null };
  if (waking) {
    if (elapsed < 30_000) return { button: WAKING[kind], detail: "The demo server is waking up. This can take a moment." };
    return { button: "Still waking the library…", detail: KEEP_OPEN[kind] };
  }
  if (elapsed < 4000) return { button: STILL[kind], detail: CHECK[kind] };
  if (elapsed < 30_000) return { button: kind === "signup" ? STILL.signup : "Opening your library…", detail: "This is taking longer than usual." };
  return { button: "Still working…", detail: KEEP_OPEN[kind] };
}

export const SUCCESS_LABEL: Record<AuthKind, string> = {
  login: "Signed in",
  signup: "Account created",
  demo: "Opening demo",
};

/** A failure worth retrying once after the API wakes: the proxy or the host, not us. */
export function isTransient(error: unknown): boolean {
  if (error instanceof TypeError || error instanceof SyntaxError) return true; // network, or an HTML gateway page
  const status = (error as { status?: number } | null)?.status;
  return status === 502 || status === 503 || status === 504;
}

// ------------------------------------------------------------------- warm-up --

type WarmState = "unknown" | "waking" | "warm";
let state: WarmState = "unknown";
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: WarmState) {
  state = next;
  listeners.forEach((l) => l());
}

export function warmState(): WarmState {
  return state;
}

export function onWarmChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Asks the API for its CSRF token, and keeps asking until it answers.
 *
 * Started as soon as a sign-in screen loads, it does two jobs. It fetches the token the
 * sign-in request will need, so submitting no longer waits for a separate token round
 * trip first. And on a sleeping host it starts the wake-up while the reader is still
 * typing, instead of when they press the button. The request is the same one the API
 * client already made lazily; nothing about the token itself changes.
 *
 * Marked "waking" once a request has taken longer than a warm API ever does (1.5s).
 */
export function warmUp({ force = false }: { force?: boolean } = {}): Promise<void> {
  if (state === "warm" && !force) return Promise.resolve();
  if (inflight) return inflight;
  inflight = (async () => {
    const slow = setTimeout(() => set("waking"), 1500);
    const giveUpAt = Date.now() + 5 * 60_000;
    try {
      while (Date.now() < giveUpAt) {
        try {
          const response = await fetch("/api/v1/csrf", { credentials: "include", cache: "no-store", signal: AbortSignal.timeout(15_000) });
          if (response.ok) {
            set("warm");
            return;
          }
        } catch {
          // Timed out or refused while the host starts; ask again.
        }
        set("waking");
        await new Promise((r) => setTimeout(r, 2000));
      }
      throw new Error("The API did not answer.");
    } finally {
      clearTimeout(slow);
      inflight = null;
    }
  })();
  return inflight;
}
