"use client";

import type { PendingCopy } from "@/lib/auth-flow";
import { SUCCESS_LABEL, type AuthKind } from "@/lib/auth-flow";
import type { Submission } from "./useAuthSubmission";

/**
 * An auth action that answers the click in the same frame: it locks, keeps its size,
 * changes its words, and shows a thin moving line underneath (not a spinner). Full width,
 * so the changing label never changes its size.
 *
 * `kind` is which action this button starts; it only shows the pending and success words
 * when that action is the one running. While the other action runs it is simply locked.
 */
export function AuthSubmit({
  kind,
  label,
  submission,
  copy,
  variant = "primary",
  type = "submit",
  onClick,
}: {
  kind: AuthKind;
  label: string;
  submission: Submission;
  copy: PendingCopy | null;
  variant?: "primary" | "demo";
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  const mine = submission.state !== "idle" && submission.kind === kind;
  const busy = submission.state !== "idle";
  const text = !mine ? label : submission.state === "success" ? SUCCESS_LABEL[kind] : copy?.button ?? label;

  return (
    <div className="auth-action" data-variant={variant} data-state={mine ? submission.state : "idle"}>
      <button
        type={type}
        onClick={onClick}
        disabled={busy}
        aria-disabled={busy || undefined}
        className="auth-action__button"
      >
        <span className="auth-action__text">{text}</span>
        <span aria-hidden="true" className="auth-action__mark">{mine && submission.state === "success" ? "✓" : "→"}</span>
      </button>
      <span aria-hidden="true" className="auth-action__progress" />
    </div>
  );
}

/**
 * The one polite live region for a form's progress. Its text only changes when the phase
 * does, so a screen reader hears "Signing in…", then (if it takes a while) the next
 * sentence, not a tick every quarter second.
 */
export function AuthStatus({ submission, copy }: { submission: Submission; copy: PendingCopy | null }) {
  const text =
    submission.state === "success" ? `${SUCCESS_LABEL[submission.kind]}. Opening your library.`
      : submission.state === "pending" ? [copy?.button, copy?.detail].filter(Boolean).join(" ")
        : "";
  return (
    <p role="status" className="auth-status">
      {/* Seen and heard separately, so the detail is not read out twice. */}
      <span aria-hidden="true">{submission.state === "pending" && copy?.detail ? copy.detail : ""}</span>
      <span className="sr-only">{text}</span>
    </p>
  );
}
