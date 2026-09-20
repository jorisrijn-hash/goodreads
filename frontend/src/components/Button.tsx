"use client";

import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "quiet";
  loading?: boolean;
};

/**
 * Forest is the only action colour in the system — see the note in globals.css about
 * forest and burgundy being indistinguishable by luminance.
 */
export function Button({
  variant = "primary", loading = false, children, disabled, className = "", ...rest
}: Props) {
  const base =
    "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-input)] " +
    "px-[var(--space-6)] text-base font-medium transition-colors " +
    "duration-[var(--motion-fast)] disabled:cursor-not-allowed disabled:opacity-60";

  const variants = {
    primary: "bg-[var(--forest)] text-[var(--ivory)] hover:bg-[var(--forest-hover)]",
    quiet:
      "border border-[var(--border-strong)] bg-transparent text-[var(--ink)] hover:bg-[var(--paper)]",
  } as const;

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      /* Announces the busy state rather than relying on a spinner nobody can hear. */
      aria-busy={loading || undefined}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading ? "Working…" : children}
    </button>
  );
}
