import Link from "next/link";
import { STATUS_LABEL, type LibrarySummary, type ReadingStatus } from "@/lib/api";

const ROWS: { status: ReadingStatus; count: (s: LibrarySummary) => number }[] = [
  { status: "WANT_TO_READ", count: (s) => s.wantToRead },
  { status: "CURRENTLY_READING", count: (s) => s.currentlyReading },
  { status: "READ", count: (s) => s.read },
  { status: "DNF", count: (s) => s.didNotFinish },
];

/**
 * The reader's shelves as a ledger: four ruled lines, the status in words and its count,
 * each a link to that shelf in the library. The counts come from the summary endpoint,
 * the same numbers the library's own tabs show. No cards, no animation.
 */
export function LibraryLedger({ summary }: { summary: LibrarySummary | null }) {
  return (
    <section aria-labelledby="ledger-heading" className="home-ledger">
      <h2 id="ledger-heading" className="type-label m-0 border-b-2 border-[var(--fg)] pb-[var(--space-3)] text-[var(--fg)]">
        Your library
      </h2>
      {summary ? (
        <ul className="m-0 list-none p-0">
          {ROWS.map(({ status, count }) => {
            const value = count(summary);
            return (
              <li key={status}>
                <Link
                  href={`/library?status=${status}`}
                  aria-label={`${STATUS_LABEL[status]}: ${value} ${value === 1 ? "book" : "books"}`}
                  className="ledger-row flex min-h-[56px] items-baseline justify-between gap-[var(--space-4)] border-b border-[var(--rule)] pt-[var(--space-4)] pb-[var(--space-3)] no-underline"
                >
                  <span className="type-label text-[0.6875rem] text-[var(--fg)]">{STATUS_LABEL[status]}</span>
                  <span className="font-serif text-[1.625rem] leading-none text-[var(--fg)] [font-variant-numeric:lining-nums_tabular-nums]">
                    {value.toLocaleString("en")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="m-0 border-b border-[var(--rule)] py-[var(--space-4)] text-[0.9375rem] text-[var(--fg-muted)]">
          Your counts could not be loaded just now.
        </p>
      )}
      <Link href="/library" className="option-link mt-[var(--space-3)]">
        Open your library <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
