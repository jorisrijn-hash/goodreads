"use client";

import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "quiet";
  size?: "default" | "large";
  loading?: boolean;
};

/**
 * Forest is the only action colour in the system — see the note in globals.css about
 * forest and burgundy being indistinguishable by luminance.
 */
export function Button({
  variant = "primary", size = "default", loading = false,
  children, disabled, className = "", ...rest
}: Props) {
  // whitespace-nowrap: a wrapped button label always looks like a mistake.
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap " +
    "rounded-[var(--radius-input)] text-base font-medium transition-colors " +
    "duration-[var(--motion-fast)] disabled:cursor-not-allowed disabled:opacity-60";

  const sizes = {
    default: "min-h-[44px] px-[var(--space-6)]",
    large: "min-h-[52px] px-[var(--space-8)]",
  } as const;

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
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {loading ? "Working…" : children}
    </button>
  );
}
