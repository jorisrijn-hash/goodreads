"use client";

import { useSyncExternalStore } from "react";

function greetingFor(hour: number): string {
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Read once per render; nothing needs to subscribe to the clock changing.
const subscribe = () => () => {};
const onServer = () => null;
const fade = (on: boolean) => ({ opacity: on ? 1 : 0, transition: "opacity var(--motion-base) var(--ease)" });

/**
 * The time-of-day greeting and today's date, in the reader's own time zone and locale.
 *
 * Both depend on the reader's clock, which only the browser knows: computed on the
 * server, production greeted a reader in the Netherlands with "Good evening" at half past
 * two in the afternoon. So the server renders the lines invisibly (reserving their space,
 * so nothing moves) and the real words fade in once the page is live.
 */
export function HomeGreeting({ name }: { name: string }) {
  const greeting = useSyncExternalStore(subscribe, () => greetingFor(new Date().getHours()), onServer);
  const today = useSyncExternalStore(
    subscribe,
    () => new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }),
    onServer,
  );

  return (
    <div>
      <p className="type-label m-0 text-[var(--fg-subtle)]">Your reading</p>
      <h1 className="home-greeting mt-[var(--space-3)]">
        <span style={fade(!!greeting)}>{greeting ?? "Good morning"},</span>
        <br />
        {name}.
      </h1>
      <p className="m-0 mt-[var(--space-3)] text-[0.9375rem] text-[var(--fg-muted)]" style={fade(!!today)}>
        {/* A non-breaking space keeps the line's height before the date arrives. */}
        {today ?? "\u00a0"}
      </p>
    </div>
  );
}

/**
 * A real stored date in the reader's locale ("12 September", or "September 12"), with the
 * year only when it is not this one. Rendered invisibly on the server so the line keeps
 * its place until the browser formats it.
 */
export function LocalDate({ iso, prefix = "", month = "long" }: { iso: string; prefix?: string; month?: "long" | "short" }) {
  const text = useSyncExternalStore(
    subscribe,
    () => {
      const date = new Date(iso);
      const thisYear = date.getFullYear() === new Date().getFullYear();
      return date.toLocaleDateString(undefined, { day: "numeric", month, ...(thisYear ? {} : { year: "numeric" }) });
    },
    onServer,
  );
  return (
    <time dateTime={iso} style={fade(!!text)}>
      {prefix}
      {text ?? iso.slice(0, 10)}
    </time>
  );
}
