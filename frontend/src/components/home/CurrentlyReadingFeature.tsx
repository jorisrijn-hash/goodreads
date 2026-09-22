import Link from "next/link";
import type { ReactNode } from "react";
import { LocalDate } from "@/components/Greeting";
import { Leaf } from "@/components/landing/Leaf";
import { PointerDepth } from "@/components/landing/PointerDepth";
import { STATUS_LABEL, type LibraryEntry } from "@/lib/api";
import { HomeCover } from "./HomeCover";

/**
 * The book in progress, as the page's one large object: the real cover on the page (no
 * card), a paper surface behind part of it, and the facts beside it.
 *
 * Only stored facts are shown. Reading progress does not exist yet, so nothing here
 * suggests it: no bar, no percentage, no page. When it arrives, it belongs directly
 * under the status line (see the marked place below), and nothing is rendered there now.
 */
export function CurrentlyReadingFeature({ entry, alsoReading }: { entry: LibraryEntry; alsoReading: LibraryEntry[] }) {
  const { book } = entry;
  return (
    <section aria-labelledby="current-heading" className="home-feature">
      <FeatureStage>
        <Link href={`/book/${book.slug}`} tabIndex={-1} aria-hidden="true" className="home-feature__cover block">
          <HomeCover
            coverKey={book.coverKey}
            title={book.title}
            author={book.authors[0]}
            sizes="(min-width: 1024px) 280px, 60vw"
            priority
          />
        </Link>
      </FeatureStage>

      <div className="home-feature__text">
        <h2 id="current-heading" className="type-label m-0 text-[var(--fg-subtle)]">Currently reading</h2>
        <h3 className="mt-[var(--space-4)] font-serif text-[clamp(2rem,3.6vw,3.25rem)] font-[380] leading-[1.04] tracking-[-0.02em] text-[var(--fg)]">
          <Link href={`/book/${book.slug}`} className="no-underline hover:underline hover:decoration-1 hover:underline-offset-[6px]">
            {book.title}
          </Link>
        </h3>
        {book.authors.length > 0 && (
          <p className="m-0 mt-[var(--space-2)] text-[1.0625rem] text-[var(--fg-muted)]">{book.authors.join(", ")}</p>
        )}
        {book.pageCount && (
          <p className="m-0 mt-[var(--space-5)] text-[0.9375rem] tabular-nums text-[var(--fg-muted)]">
            {book.pageCount.toLocaleString("en")} pages
          </p>
        )}
        <p className="m-0 mt-[var(--space-2)] text-[0.9375rem] text-[var(--fg)]">
          {STATUS_LABEL[entry.status]}
          {entry.startedAt && <> · <LocalDate iso={entry.startedAt} prefix="Started " /></>}
        </p>

        {/* Checkpoint E: page progress and the latest update go here, once they exist. */}

        <div className="mt-[var(--space-8)] border-t border-[var(--rule)] pt-[var(--space-6)]">
          <Link
            href={`/book/${book.slug}`}
            className="inline-flex min-h-[48px] items-center gap-[var(--space-3)] bg-[var(--forest)] px-[var(--space-6)] text-[0.9375rem] font-medium text-[var(--ivory)] no-underline transition-colors duration-[var(--motion-fast)] hover:bg-[var(--forest-hover)]"
          >
            Open book <span aria-hidden="true">→</span>
          </Link>
        </div>

        {alsoReading.length > 0 && (
          <div className="mt-[var(--space-8)]">
            <h3 className="type-label m-0 text-[0.625rem] text-[var(--fg-subtle)]">Also reading</h3>
            <ul className="m-0 mt-[var(--space-3)] flex list-none flex-wrap gap-[var(--space-4)] p-0">
              {alsoReading.slice(0, 4).map((other) => (
                <li key={other.book.slug}>
                  <Link href={`/book/${other.book.slug}`} className="also-reading group flex max-w-[15rem] items-center gap-[var(--space-3)] no-underline">
                    <span className="w-[44px] shrink-0">
                      <HomeCover coverKey={other.book.coverKey} title={other.book.title} sizes="44px" />
                    </span>
                    <span className="min-w-0">
                      <span className="block line-clamp-2 font-serif text-[0.9375rem] leading-snug text-[var(--fg)] group-hover:underline">{other.book.title}</span>
                      <span className="block truncate text-[0.8125rem] text-[var(--fg-muted)]">{other.book.authors[0]}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * The desk the book lies on: a paper surface behind part of it, one slow leaf shadow, and
 * a few pixels of pointer depth.
 */
function FeatureStage({ children }: { children: ReactNode }) {
  return (
    <PointerDepth className="home-feature__stage">
      <span aria-hidden="true" className="home-feature__paper" />
      <Leaf shadow width="22rem" rotate={-32} className="home-feature__leaf" priority />
      <div className="home-feature__settle">{children}</div>
    </PointerDepth>
  );
}

/**
 * Nothing in progress. With books saved, up to three from the Want to Read list, labelled
 * as the reader's own; with an empty library, only the way to the catalogue.
 */
export function NothingInProgress({ wantToRead, libraryEmpty }: { wantToRead: LibraryEntry[]; libraryEmpty: boolean }) {
  return (
    <section aria-labelledby="current-heading" className="home-feature home-feature--empty">
      <div className="home-feature__text">
        <h2 id="current-heading" className="type-label m-0 text-[var(--fg-subtle)]">Nothing in progress</h2>
        <p className="m-0 mt-[var(--space-4)] font-serif text-[clamp(2rem,3.6vw,3.25rem)] font-[380] leading-[1.04] tracking-[-0.02em] text-[var(--fg)]">
          {libraryEmpty ? "Choose your first book." : "Choose your next book."}
        </p>
        <p className="m-0 mt-[var(--space-4)] max-w-[44ch] leading-relaxed text-[var(--fg-muted)]">
          {libraryEmpty
            ? "Save a book from the catalogue and it appears in your library. Start reading it and it waits for you here."
            : "Start one of the books you have saved, and it waits for you here."}
        </p>
        <div className="mt-[var(--space-8)]">
          <Link
            href="/discover"
            className="inline-flex min-h-[48px] items-center gap-[var(--space-3)] bg-[var(--forest)] px-[var(--space-6)] text-[0.9375rem] font-medium text-[var(--ivory)] no-underline transition-colors duration-[var(--motion-fast)] hover:bg-[var(--forest-hover)]"
          >
            Explore books <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {wantToRead.length > 0 && (
        <div className="home-feature__picks">
          <h3 className="type-label m-0 text-[0.625rem] text-[var(--fg-subtle)]">From your Want to Read list</h3>
          <ul className="m-0 mt-[var(--space-4)] grid list-none grid-cols-3 gap-[var(--space-4)] p-0">
            {wantToRead.slice(0, 3).map((entry) => (
              <li key={entry.book.slug}>
                <Link href={`/book/${entry.book.slug}`} className="home-tile group block no-underline">
                  <span className="home-tile__display">
                    <HomeCover coverKey={entry.book.coverKey} title={entry.book.title} author={entry.book.authors[0]} sizes="(min-width: 1024px) 110px, 22vw" />
                  </span>
                  <span className="mt-[var(--space-3)] block line-clamp-2 font-serif text-[0.9375rem] leading-snug text-[var(--fg)]">{entry.book.title}</span>
                  <span className="block truncate text-[0.8125rem] text-[var(--fg-muted)]">{entry.book.authors[0]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
