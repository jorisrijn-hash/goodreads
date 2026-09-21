"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Render Free cold starts measured at well under this; beyond it, something is wrong. */
const GIVE_UP_AFTER_MS = 120_000;
const POLL_EVERY_MS = 3_000;

/**
 * Shown when the API did not answer in time.
 *
 * The backend runs on a free tier that sleeps when idle and takes a while to start. That
 * is a waiting state, not a failure, so this says so plainly, checks in the background,
 * and reloads the page's data the moment the API answers. Only if it stays silent well
 * past a normal start does it admit that something is actually wrong.
 */
export function WakingUp({ what = "the library" }: { what?: string }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (gaveUp) return;
    let cancelled = false;
    // Measured from each attempt, so "Try again" gets a full window of its own.
    const startedAt = Date.now();

    async function poll() {
      while (!cancelled) {
        try {
          // The cheapest endpoint there is, and it goes through the same rewrite the
          // page's own requests use.
          const response = await fetch("/api/v1/csrf", {
            cache: "no-store",
            credentials: "include",
            signal: AbortSignal.timeout(15_000),
          });
          if (response.ok) {
            if (!cancelled) router.refresh();
            return;
          }
        } catch {
          // Still starting. Keep waiting.
        }
        if (Date.now() - startedAt > GIVE_UP_AFTER_MS) {
          if (!cancelled) setGaveUp(true);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_EVERY_MS));
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [router, gaveUp, attempt]);

  if (gaveUp) {
    return (
      <div role="alert" className="border-l-2 border-[var(--burgundy)] py-[var(--space-2)] pl-[var(--space-5)]">
        <h2 className="font-serif text-[1.375rem] text-[var(--ink)]">{what} is not responding</h2>
        <p className="mt-[var(--space-2)] max-w-[52ch] leading-relaxed text-[var(--ink-70)]">
          The service has not answered for two minutes, which is longer than a normal start.
        </p>
        <button
          type="button"
          onClick={() => {
            setGaveUp(false);
            setAttempt((n) => n + 1);
          }}
          className="mt-[var(--space-5)] inline-flex min-h-[44px] items-center rounded-[var(--radius-input)]
                     bg-[var(--forest)] px-[var(--space-6)] text-base font-medium text-[var(--ivory)]
                     transition-colors duration-[var(--motion-fast)] hover:bg-[var(--forest-hover)]"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    // polite: this is a progress report, not an interruption.
    <div role="status" aria-live="polite" className="border-l-2 border-[var(--border-strong)] py-[var(--space-2)] pl-[var(--space-5)]">
      <h2 className="font-serif text-[1.375rem] text-[var(--ink)]">Opening {what}…</h2>
      <p className="mt-[var(--space-2)] max-w-[56ch] leading-relaxed text-[var(--ink-70)]">
        The server behind this demo sleeps when nobody is using it and takes up to a minute
        to wake. This page will fill in by itself as soon as it does.
      </p>
    </div>
  );
}
