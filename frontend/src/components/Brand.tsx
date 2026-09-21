/**
 * The supplied Goodreads marks, used as supplied (see scripts/prepare-brand.mjs).
 *
 * Every use carries "Independent redesign" beside it: this is a case study, and the mark
 * must never stand alone in a way that reads as the real service — least of all next to
 * a password field. `compact` swaps the full wordmark for the "g" where the wordmark
 * would not fit; the label stays.
 */

// Intrinsic sizes of the prepared files, so the browser reserves their space.
const WORDMARK = { width: 477, height: 107 };
const G = { width: 217, height: 364 };

export function Wordmark({ tone = "ink", height = 22, className = "", lazy = false }: { tone?: "ink" | "ivory"; height?: number; className?: string; lazy?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a small static PNG; nothing to optimise
    <img
      src={`/brand/goodreads-wordmark-${tone}.png`}
      alt="goodreads"
      width={Math.round((height * WORDMARK.width) / WORDMARK.height)}
      height={height}
      loading={lazy ? "lazy" : undefined}
      className={`block ${className}`}
    />
  );
}

export function GMark({ tone = "ink", height = 26, className = "", lazy = false }: { tone?: "ink" | "ivory"; height?: number; className?: string; lazy?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a small static PNG; nothing to optimise
    <img
      src={`/brand/goodreads-g-${tone}.png`}
      alt="goodreads"
      width={Math.round((height * G.width) / G.height)}
      height={height}
      loading={lazy ? "lazy" : undefined}
      className={`block ${className}`}
    />
  );
}

/** Mark + the redesign label, as one unit. */
export function BrandLockup({
  tone = "ink",
  mark = "wordmark",
  compactBelow,
  labelOnCompact = true,
  height = 22,
  lazy = false,
}: {
  tone?: "ink" | "ivory";
  mark?: "wordmark" | "g";
  /** Switch to the "g" below this breakpoint (the label stays). */
  compactBelow?: "sm";
  /** Keep the label beside the "g" on phones. Only the signed-in header drops it, where
   *  there is no room and the reader has already passed the disclaimed login. */
  labelOnCompact?: boolean;
  height?: number;
  /** Below the fold (the footer): load when it scrolls near. */
  lazy?: boolean;
}) {
  return (
    <span className="flex items-center gap-[var(--space-3)]">
      {mark === "g" ? (
        <GMark tone={tone} height={Math.round(height * 1.2)} lazy={lazy} />
      ) : compactBelow ? (
        <>
          {/* Lazy, so the variant a layout hides is never fetched. */}
          <GMark tone={tone} height={Math.round(height * 1.2)} className="sm:hidden" lazy />
          <Wordmark tone={tone} height={height} className="hidden sm:block" lazy />
        </>
      ) : (
        <Wordmark tone={tone} height={height} lazy={lazy} />
      )}
      <span className={`type-label border-l border-[var(--rule-strong)] pl-[var(--space-3)] leading-[1.3] text-[var(--fg-muted)] max-sm:max-w-[6.5rem] max-sm:text-[0.5625rem] max-sm:tracking-[0.12em] ${labelOnCompact ? "" : "max-sm:hidden"}`}>
        Independent redesign
      </span>
    </span>
  );
}
