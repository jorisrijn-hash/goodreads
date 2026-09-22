"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isTransient, onWarmChange, pendingCopy, warmState, warmUp, type AuthKind } from "@/lib/auth-flow";
import { useLeave } from "./AuthShell";

export type Submission =
  | { state: "idle" }
  | { state: "pending"; kind: AuthKind; since: number }
  | { state: "success"; kind: AuthKind };

/**
 * One submission at a time for a whole form (sign in and the demo share it), with the
 * words to show while it runs.
 *
 * - The lock is a ref, set in the same event as the click: a second click, or Enter in a
 *   field, cannot start a second request, even before React has re-rendered.
 * - The request waits for the API's token first. On a warm API that is already done (the
 *   page fetched it on arrival); on a sleeping one this is the wake-up, and the copy says so.
 * - Sign in and the demo are retried once after a gateway or network failure, once the API
 *   answers again. Sign-up is not: if the first request reached the API before the gateway
 *   gave up, repeating it would report the new account as already taken.
 * - On success the shell takes over: navigation starts at once, under the exit.
 */
export function useAuthSubmission() {
  const [submission, setSubmission] = useState<Submission>({ state: "idle" });
  const lock = useRef(false);
  const leave = useLeave();
  const now = useElapsedClock(submission.state === "pending");
  const waking = useSyncExternalStore(onWarmChange, () => warmState() === "waking", () => false);

  const run = useCallback(
    async (kind: AuthKind, task: () => Promise<unknown>, href: string): Promise<"ok" | unknown> => {
      if (lock.current) return "busy";
      lock.current = true;
      setSubmission({ state: "pending", kind, since: Date.now() });
      try {
        await warmUp();
        try {
          await task();
        } catch (error) {
          if (kind === "signup" || !isTransient(error)) throw error;
          await warmUp({ force: true });
          await task();
        }
        setSubmission({ state: "success", kind });
        leave(kind, href);
        return "ok";
      } catch (error) {
        lock.current = false;
        setSubmission({ state: "idle" });
        return error;
      }
    },
    [leave],
  );

  const copy = submission.state === "pending" ? pendingCopy(submission.kind, now - submission.since, waking) : null;
  return { submission, copy, run, busy: submission.state !== "idle" };
}

/** A clock that ticks four times a second, only while something is pending. */
function useElapsedClock(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [active]);
  return active ? now : 0;
}
