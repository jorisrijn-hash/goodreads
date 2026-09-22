"use client";

import { forwardRef, useId, type ReactNode } from "react";

type Props = {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  /** Shown beside the hint but not announced: a live count would speak on every key. */
  aside?: ReactNode;
  /** Read-only while a submission is in flight: values stay, nothing can change mid-request. */
  locked?: boolean;
  autoFocus?: boolean;
  enterKeyHint?: "next" | "go" | "done";
};

/**
 * A labelled field for the sign-in screens: a real <label> (never placeholder text), hard
 * edges, a forest border and a paper inset on focus. Errors sit beside the field behind a
 * burgundy rule, in words, and are tied to the input with aria-describedby.
 */
export const AuthField = forwardRef<HTMLInputElement, Props>(function AuthField(
  { label, name, type = "text", autoComplete, value, onChange, error, hint, aside, locked = false, autoFocus = false, enterKeyHint },
  ref,
) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="auth-field" data-invalid={error ? true : undefined}>
      <label htmlFor={id} className="auth-field__label">{label}</label>
      <input
        ref={ref}
        id={id}
        name={name}
        type={type}
        value={value}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required
        readOnly={locked}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        enterKeyHint={enterKeyHint}
        // Emails and usernames are not prose: no autocorrect or capitalisation.
        autoCapitalize={type === "password" ? undefined : "none"}
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        className="auth-field__input"
      />
      {(hint || aside) && (
        <div className="auth-field__meta">
          {hint && <p id={hintId} className="m-0">{hint}</p>}
          {aside && <p aria-hidden="true" className="m-0 ml-auto tabular-nums">{aside}</p>}
        </div>
      )}
      {error && <p id={errorId} className="auth-error">{error}</p>}
    </div>
  );
});
