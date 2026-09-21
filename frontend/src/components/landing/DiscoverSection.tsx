import Link from "next/link";
import { Suspense } from "react";
import type { BookPage, CatalogueStats, Genre } from "@/lib/api";
import { BookCard } from "../BookCard";
import { Reveal } from "../motion/Reveal";
import { SearchInput } from "../SearchInput";
import { SectionHeader } from "../SectionHeader";

/**
 * 02 — Discover, on forest.
 *
 * The product is the picture: a working search field, the real genre list with its real
 * counts, and beside them a real search response — a misspelled author, corrected, the
 * way the catalogue actually answers it.
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
  return (
    <section data-surface="forest" aria-labelledby="discover-heading" className="relative">
      <div className="page-frame grid grid-cols-[minmax(0,1fr)] gap-y-[var(--space-12)] py-[var(--space-16)] lg:grid-cols-12 lg:gap-x-[var(--space-8)] lg:py-[7.5rem]">
        <Reveal className="lg:col-span-5">
          <SectionHeader number="02" label="Discover">
            <span id="discover-heading">Find the book, even when you misspell it.</span>
          </SectionHeader>
          <p className="mt-[var(--space-6)] max-w-[44ch] text-[1.0625rem] leading-[1.65] text-[var(--fg-muted)]">
            Search {stats ? stats.books.toLocaleString("en") : "the"} books by title, author
            or ISBN. When a search has a typo, it finds the closest match and says that it did.
          </p>
          <div className="mt-[var(--space-8)] max-w-[34rem]">
            <Suspense fallback={null}>
              <SearchInput tone="dark" />
            </Suspense>
          </div>

          {genres && genres.length > 0 && (
            <nav aria-label="Browse by genre" className="mt-[var(--space-10)] max-w-[34rem]">
              <h3 className="type-label text-[var(--fg-subtle)]">Browse by genre</h3>
              <ul className="mt-[var(--space-4)] grid list-none grid-cols-2 gap-x-[var(--space-8)] p-0">
                {genres.slice(0, 10).map((genre) => (
                  <li key={genre.slug} className="border-t border-[var(--rule)]">
                    <Link
                      href={`/discover?genre=${genre.slug}`}
                      className="flex min-h-[44px] items-center justify-between gap-[var(--space-3)]
                                 text-[0.9375rem] text-[var(--fg)] no-underline
                                 transition-colors duration-[var(--motion-fast)] hover:text-[var(--fg-muted)]"
                    >
                      {genre.name}
                      <span className="text-[0.8125rem] text-[var(--fg-subtle)] [font-variant-numeric:tabular-nums]">
                        {genre.bookCount.toLocaleString("en")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </Reveal>

        {typo && typo.items.length > 0 && (
          <Reveal delay={0.12} className="lg:col-span-6 lg:col-start-7 lg:self-center">
            <figure data-surface="ivory" className="rounded-[var(--radius-card)] p-[var(--space-6)] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)] sm:p-[var(--space-8)]">
              {/* A depiction of the search field, not a second one: the real field is on
                  the left. */}
              <div aria-hidden="true" className="flex min-h-[48px] items-center rounded-[var(--radius-input)] border border-[var(--border-strong)] bg-white/60 px-[var(--space-4)] text-[var(--ink)]">
                {typoQuery}
              </div>
              <p className="mt-[var(--space-5)] text-[0.875rem] text-[var(--ink-70)]">
                {typo.total} {typo.total === 1 ? "book" : "books"}
                {typo.correctedFrom && (
                  <span className="ml-[var(--space-3)] text-[var(--ink-60)]">
                    Showing results for a close match to <span className="text-[var(--ink)]">“{typo.correctedFrom}”</span>
                  </span>
                )}
              </p>
              <ul className="mt-[var(--space-5)] grid list-none grid-cols-3 gap-[var(--space-5)] p-0">
                {typo.items.slice(0, 3).map((book) => (
                  <li key={book.slug}><BookCard book={book} /></li>
                ))}
              </ul>
              <figcaption className="mt-[var(--space-6)] border-t border-[var(--rule)] pt-[var(--space-4)] text-[0.8125rem] text-[var(--ink-60)]">
                The catalogue&rsquo;s own answer to “{typoQuery}”, fetched live.
              </figcaption>
            </figure>
          </Reveal>
        )}
      </div>
    </section>
  );
}
