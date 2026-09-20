"use client";

import { useId } from "react";

type Props = {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  autoFocus?: boolean;
};

/**
 * A labelled input.
 *
 * The label is a real <label>, never placeholder text: placeholders vanish the moment
 * someone types, are invisible to some screen readers, and fail contrast far more often
 * than they pass. `autoComplete` is always required by the prop type, because omitting
 * it is what breaks password managers.
 */
export function FormField({
  label, name, type = "text", autoComplete, value, onChange,
  error, hint, required = true, autoFocus = false,
}: Props) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      <label
        htmlFor={id}
        className="text-sm font-medium tracking-wide text-[var(--ink)]"
      >
        {label}
      </label>

      {hint && (
        <p id={hintId} className="text-sm text-[var(--ink-60)]">
          {hint}
        </p>
      )}

      <input
        id={id}
        name={name}
        type={type}
        value={value}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        /* min-height 44px: a comfortable touch target, not a desktop-sized control
           shrunk onto a phone. 16px font stops iOS zooming the viewport on focus. */
        className="min-h-[44px] w-full rounded-[var(--radius-input)] border bg-white/60
                   px-[var(--space-3)] text-base text-[var(--ink)]
                   transition-colors duration-[var(--motion-fast)]
                   placeholder:text-[var(--ink-60)]
                   focus:border-[var(--forest)] focus:bg-white/90"
        style={{
          /* The border is the only thing marking this boundary, so it must clear 3:1
             against the page. --border alone is 1.37:1 and would not. */
          borderColor: error ? "var(--burgundy)" : "var(--border-strong)",
        }}
      />

      {error && (
        <p
          id={errorId}
          className="text-sm font-medium text-[var(--burgundy)]"
        >
          {/* An icon-free, text-first error: colour is never the only signal. */}
          {error}
        </p>
      )}
    </div>
  );
}
