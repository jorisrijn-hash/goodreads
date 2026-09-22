"use client";

import { useEffect, useRef } from "react";

/**
 * A form's one summary of what went wrong: a burgundy rule and a sentence, announced
 * when it appears. `focus` moves focus to it (the default for an answer from the server,
 * such as a failed sign-in); a form that instead focuses the first invalid field passes
 * false, and the alert is still announced.
 */
export function FormError({ message, focus = true }: { message: string | null; focus?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && focus) ref.current?.focus();
  }, [message, focus]);

  if (!message) return null;
  return (
    <div ref={ref} role="alert" tabIndex={-1} className="auth-error auth-error--summary">
      {message}
    </div>
  );
}
