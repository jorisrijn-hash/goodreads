"use client";

import { useSyncExternalStore } from "react";

function greetingFor(hour: number): string {
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// The hour is read once per render; nothing needs to subscribe to it changing.
const subscribe = () => () => {};
const clientGreeting = () => greetingFor(new Date().getHours());
const serverGreeting = () => null;

/**
 * The time-of-day greeting, in the reader's own time zone.
 *
 * It used to be computed during server rendering, which runs on the server's clock:
 * production greeted a reader in the Netherlands with "Good evening" at half past two
 * in the afternoon. Only the browser knows the reader's hour, so the server renders a
 * reserved, empty line and the greeting fades in once the page is live.
 */
export function Greeting({ className }: { className?: string }) {
  const text = useSyncExternalStore(subscribe, clientGreeting, serverGreeting);

  return (
    <p
      className={className}
      style={{ opacity: text ? 1 : 0, transition: "opacity var(--motion-base) var(--ease)" }}
    >
      {text ?? " "}
    </p>
  );
}
