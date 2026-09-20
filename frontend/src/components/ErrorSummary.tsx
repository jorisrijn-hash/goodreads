"use client";

import { useEffect, useRef } from "react";

/**
 * A single summary of what went wrong, announced and focused when it appears.
 *
 * Without this, a screen-reader user who submits a form gets no indication that
 * anything happened — the errors render silently further down the page.
 */
export function ErrorSummary({ message }: { message: string | null }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message) ref.current?.focus();
  }, [message]);

  if (!message) return null;

  return (
    <div
      ref={ref}
      // assertive: the reader has just submitted and is waiting on this specific answer.
      role="alert"
      tabIndex={-1}
      className="rounded-[var(--radius-card)] border-l-2 border-[var(--burgundy)]
                 bg-[var(--paper)] px-[var(--space-4)] py-[var(--space-3)]
                 text-sm text-[var(--ink)]"
    >
      {message}
    </div>
  );
}
