import Link from "next/link";
import type { BookPage, CatalogueStats, Genre } from "@/lib/api";
import { BookObject } from "../BookObject";
import { Reveal } from "../motion/Reveal";
import { Photograph } from "../Photograph";
import { SectionLabel } from "../SectionHeader";

/**
 * 02 — Discover: a product moment, not a feature description.
 *
 * An oversized search field floats over a dimmed photograph of a library. It is the real
 * search — a plain GET form, so it works before any script loads — prefilled with a
 * misspelled author. Beneath it, the catalogue's real answer to that query unfolds as
 * three books, with the real "close match" notice. The genres run along the foot as a
 * rail. As the section scrolls in, it opens from a slightly inset panel to full width.
 */
export function DiscoverSection({
  stats,
  genres,
  typo,
  typoQuery,
}: {
  stats: CatalogueStats | null;
  genres: Genre[] | null;
  typo: BookPage | null;
  typoQuery: string;
}) {
  const results = typo?.items.slice(0, 3) ?? [];
  const turns = [9, -2, -11];

  return (
    <section data-surface="forest" aria-labelledby="discover-heading" className="forest-reveal relative z-10 overflow-hidden">
      <Photograph
        id="old-library"
        sizes="100vw"
        className="discover-photo pointer-events-none absolute inset-0"
        imgClassName="h-full w-full object-cover object-[50%_35%]"
      />

      <div className="page-frame relative pb-[7rem] pt-[calc(var(--space-16)+3rem)] lg:pb-[8rem] lg:pt-[9rem]">
        <Reveal className="mx-auto max-w-[52rem] text-center">
          <SectionLabel number="02" label="Discover" centered />
          <h2 id="discover-heading" className="type-display-l mx-auto mt-[var(--space-6)] max-w-[15ch] text-balance">
            Find the book, even when you misspell it.
          </h2>
          <p className="mx-auto mt-[var(--space-5)] max-w-[44ch] text-[1.0625rem] leading-[1.6] text-[var(--fg-muted)]">
            Search {stats ? `${stats.books.toLocaleString("en")} books` : "the catalogue"} by
            title, author or ISBN. Typos included — and it tells you when it corrected one.
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mx-auto mt-[var(--space-12)] w-full max-w-[56rem]">
          <form role="search" action="/discover" method="get" className="hero-search">
            <label htmlFor="landing-search" className="sr-only">Search books, authors or ISBN</label>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="shrink-0 text-[var(--fg-subtle)]">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4.5 4.5" />
            </svg>
            <input id="landing-search" name="q" type="search" defaultValue={typoQuery} placeholder="Title, author or ISBN" autoComplete="off" />
            <button type="submit" className="action action--light">
              Search <span aria-hidden="true" className="action__arrow">→</span>
            </button>
          </form>

          {typo && (
            <p className="mt-[var(--space-5)] text-center text-[0.875rem] text-[var(--fg-muted)]">
              <span className="text-[var(--fg)]">{typo.total} {typo.total === 1 ? "book" : "books"}</span>
              {typo.correctedFrom && (
                <>
                  <span aria-hidden="true" className="mx-[var(--space-3)] text-[var(--fg-subtle)]">·</span>
                  Showing results for a close match to “{typo.correctedFrom}”
                </>
              )}
            </p>
          )}
        </Reveal>

        {results.length > 0 && (
          <Reveal className="unfold mt-[var(--space-10)]">
            <ul className="mx-auto flex max-w-[52rem] list-none items-end justify-center gap-[clamp(0.75rem,3vw,3rem)] p-0">
              {results.map((book, i) => (
                <li key={book.slug} className="unfold__item book-stage flex flex-col items-center" style={{ ["--i" as string]: i }}>
                  <BookObject
                    slug={book.slug}
                    title={book.title}
                    authors={book.authors}
                    coverKey={book.coverKey}
                    pageCount={book.pageCount}
                    width={i === 1 ? "clamp(6.5rem, 20vw, 13rem)" : "clamp(5.5rem, 17vw, 11rem)"}
                    turn={turns[i]}
                    sizes="13rem"
                  />
                  {/* The metadata on paper, as the result list shows it. */}
                  <p data-surface="paper" className="mt-[var(--space-6)] rounded-[3px] px-[var(--space-3)] py-[var(--space-2)] text-center shadow-[0_12px_24px_-16px_rgba(0,0,0,0.6)]">
                    <span className="block font-serif text-[0.9375rem] leading-tight">{book.title}</span>
                    <span className="block text-[0.75rem] text-[var(--ink-60)]">{book.authors[0]}</span>
                  </p>
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        {genres && genres.length > 0 && (
          <nav aria-label="Browse by genre" className="genre-rail mt-[var(--space-16)] border-t border-[var(--rule)] pt-[var(--space-5)]">
            <div className="flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-baseline sm:gap-[var(--space-8)]">
              <h3 className="type-label shrink-0 text-[var(--fg-subtle)]">Browse by genre</h3>
              {/* min-w-0: a flex item will not shrink below its content otherwise, and the rail
                  would widen the page instead of scrolling within itself. */}
              <ul className="genre-rail__list flex min-w-0 flex-1 list-none gap-[var(--space-8)] overflow-x-auto p-0 pb-[var(--space-2)]">
                {genres.map((genre) => (
                  <li key={genre.slug} className="shrink-0">
                    <Link href={`/discover?genre=${genre.slug}`} className="link-rule whitespace-nowrap text-[0.9375rem] text-[var(--fg)]">
                      {genre.name}
                      <span className="ml-[var(--space-2)] text-[0.8125rem] text-[var(--fg-subtle)] [font-variant-numeric:tabular-nums]">
                        {genre.bookCount.toLocaleString("en")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        )}
      </div>
    </section>
  );
}
