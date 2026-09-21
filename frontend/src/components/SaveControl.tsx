"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ApiError, SAVE_REASON_LABEL, STATUS_LABEL,
  api, type LibraryEntry, type ReadingStatus, type SaveReason,
} from "@/lib/api";
import { loginHref } from "@/lib/return-to";
import { Button } from "./Button";

const NEXT_STATUS: Partial<Record<ReadingStatus, ReadingStatus>> = {
  WANT_TO_READ: "CURRENTLY_READING",
};

/**
 * The single stateful action on Book Detail.
 *
 * <p>One button whose meaning follows the reader's relationship with the book: save it,
 * start it, or change where it stands. The save itself is one tap and never waits on a
 * form — the reason and note are offered afterwards and can be skipped or added later.
 */
export function SaveControl({
  slug,
  initialEntry,
  isAuthenticated,
  autoSave = false,
}: {
  slug: string;
  initialEntry: LibraryEntry | null;
  isAuthenticated: boolean;
  /** Set when the reader asked to save before signing in; completes their intent. */
  autoSave?: boolean;
}) {
  const router = useRouter();
  const [entry, setEntry] = useState<LibraryEntry | null>(initialEntry);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const autoSaveDone = useRef(false);

  // The reader clicked "Want to Read" while signed out, signed in, and came back here.
  // Finish what they started rather than making them click again.
  useEffect(() => {
    if (autoSave && isAuthenticated && !entry && !autoSaveDone.current) {
      autoSaveDone.current = true;
      void save("WANT_TO_READ", { announceDetails: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSave, isAuthenticated]);

  async function save(status: ReadingStatus, options: { announceDetails?: boolean } = {}) {
    if (!isAuthenticated) {
      // Preserve the intent through sign-in. safeReturnTo validates this on the way back.
      router.push(loginHref(`/book/${slug}?save=1`));
      return;
    }

    const previous = entry;
    setPending(true);
    setError(null);
    // Optimistic: the button reflects the new state immediately, and rolls back if the
    // server disagrees. Safe because the only thing shown is what we just asked for.
    setEntry(current =>
      current ? { ...current, status } : ({ status, book: null } as unknown as LibraryEntry));

    try {
      const saved = previous
        ? await api.updateLibraryEntry(slug, { status })
        : await api.saveBook(slug, { status });
      setEntry(saved);
      if (options.announceDetails || !previous) {
        setShowDetails(true);
      }
      router.refresh();
    } catch (cause) {
      setEntry(previous);
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Could not reach the server. Your library is unchanged.",
      );
    } finally {
      setPending(false);
      setMenuOpen(false);
    }
  }

  async function remove() {
    const previous = entry;
    setPending(true);
    setEntry(null);
    try {
      await api.removeBook(slug);
      setShowDetails(false);
      router.refresh();
    } catch {
      setEntry(previous);
      setError("Could not remove this book.");
    } finally {
      setPending(false);
      setMenuOpen(false);
    }
  }

  const status = entry?.status ?? null;
  const next = status ? NEXT_STATUS[status] : null;

  const primaryLabel = !status
    ? "Want to Read"
    : next
      ? `Start reading`
      : STATUS_LABEL[status];

  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      <div className="flex flex-wrap items-center gap-[var(--space-2)]">
        <Button
          size="large"
          variant={status && !next ? "quiet" : "primary"}
          loading={pending}
          onClick={() => save(next ?? (status ?? "WANT_TO_READ"))}
          aria-describedby={status ? "reading-status" : undefined}
        >
          {primaryLabel}
        </Button>

        {status && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(open => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="inline-flex min-h-[52px] items-center rounded-[var(--radius-input)]
                         border border-[var(--border-strong)] px-[var(--space-4)]
                         text-base text-[var(--ink)] transition-colors
                         duration-[var(--motion-fast)] hover:bg-[var(--paper)]"
            >
              Change<span aria-hidden="true" className="ml-2">▾</span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute left-0 z-10 mt-[var(--space-2)] w-60 rounded-[var(--radius-card)]
                           border border-[var(--border-strong)] bg-[var(--ivory)]
                           py-[var(--space-2)] shadow-sm"
              >
                {(Object.keys(STATUS_LABEL) as ReadingStatus[]).map(option => (
                  <button
                    key={option}
                    role="menuitemradio"
                    aria-checked={status === option}
                    onClick={() => save(option)}
                    className="flex min-h-[44px] w-full items-center justify-between
                               px-[var(--space-4)] text-left text-[var(--ink)]
                               transition-colors duration-[var(--motion-fast)]
                               hover:bg-[var(--paper)]"
                  >
                    {STATUS_LABEL[option]}
                    {status === option && <span aria-hidden="true">✓</span>}
                  </button>
                ))}
                <button
                  role="menuitem"
                  onClick={remove}
                  className="mt-[var(--space-2)] flex min-h-[44px] w-full items-center
                             border-t border-[var(--border)] px-[var(--space-4)]
                             text-left text-[var(--burgundy)] transition-colors
                             duration-[var(--motion-fast)] hover:bg-[var(--paper)]"
                >
                  Remove from library
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {status && (
        <p id="reading-status" className="text-[0.875rem] text-[var(--ink-70)]">
          In your library as <span className="text-[var(--ink)]">{STATUS_LABEL[status]}</span>
        </p>
      )}

      {error && (
        <p role="alert" className="text-[0.875rem] text-[var(--burgundy)]">
          {error}
        </p>
      )}

      {entry && (showDetails || entry.saveReason || entry.saveNote) && (
        <SaveDetails
          slug={slug}
          entry={entry}
          onSaved={(updated) => setEntry(updated)}
        />
      )}
    </div>
  );
}

/**
 * Why the book was saved.
 *
 * <p>Appears only after the book is already in the library. It answers the complaint that
 * a to-read pile forgets where everything came from, without ever standing between a
 * reader and saving something.
 */
function SaveDetails({
  slug, entry, onSaved,
}: {
  slug: string;
  entry: LibraryEntry;
  onSaved: (entry: LibraryEntry) => void;
}) {
  const [reason, setReason] = useState<SaveReason | "">(entry.saveReason ?? "");
  const [note, setNote] = useState(entry.saveNote ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateLibraryEntry(slug, {
        saveReason: reason === "" ? null : reason,
        saveNote: note.trim() === "" ? null : note.trim(),
      });
      if (updated) onSaved(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-[var(--space-3)] border-l-2 border-[var(--border-strong)] pl-[var(--space-4)]"
    >
      <p className="font-serif text-[1.0625rem] text-[var(--ink)]">Why did you save this?</p>
      <p className="mt-[2px] text-[0.8125rem] text-[var(--ink-60)]">
        Optional. It is easy to forget where a book came from.
      </p>

      <div className="mt-[var(--space-3)] flex flex-col gap-[var(--space-3)]">
        <div>
          <label htmlFor="save-reason" className="sr-only">Reason</label>
          <select
            id="save-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value as SaveReason | "")}
            className="min-h-[44px] w-full max-w-[380px] rounded-[var(--radius-input)]
                       border border-[var(--border-strong)] bg-white/60 px-[var(--space-3)]
                       text-base text-[var(--ink)]"
          >
            <option value="">No particular reason</option>
            {(Object.keys(SAVE_REASON_LABEL) as SaveReason[]).map(value => (
              <option key={value} value={value}>{SAVE_REASON_LABEL[value]}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="save-note" className="sr-only">Note</label>
          <textarea
            id="save-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Sam mentioned it while we were talking about New York."
            className="w-full max-w-[520px] rounded-[var(--radius-input)] border
                       border-[var(--border-strong)] bg-white/60 px-[var(--space-3)]
                       py-[var(--space-2)] text-base text-[var(--ink)]
                       placeholder:text-[var(--ink-60)]"
          />
        </div>

        <div className="flex items-center gap-[var(--space-3)]">
          <Button type="submit" variant="quiet" loading={saving}>
            {entry.saveReason || entry.saveNote ? "Update note" : "Save note"}
          </Button>
          {saved && (
            <span role="status" className="text-[0.875rem] text-[var(--ink-60)]">
              Saved.
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
