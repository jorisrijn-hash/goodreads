import Link from "next/link";
import type { Book, Genre } from "@/lib/api";
import { TileCover } from "./TileCover";
import { discoverHref, type DiscoverParams } from "./params";

export type RailItem = { genre: Genre; covers: Book[] };

/**
 * Genre navigation: a rail of the larger genres, each shown by three real covers from it,
 * and the complete index of every genre in a disclosure below. The rail is a way in, not
 * the taxonomy; nothing is reachable only from it, and nothing is hidden by it.
 *
 * Plain links throughout, so it works before (and without) JavaScript.
 */
export function GenreRail({ items, genres, params }: { items: RailItem[]; genres: Genre[]; params: DiscoverParams }) {
  const active = params.genre;
  const activeOffRail = active && !items.some((item) => item.genre.slug === active);

  return (
    <nav aria-label="Genres" className="relative">
      {items.length > 0 && (
        <ul className="genre-rail -mx-[var(--gutter)] m-0 flex list-none snap-x snap-mandatory scroll-px-[var(--gutter)] gap-[var(--space-4)] overflow-x-auto px-[var(--gutter)] pb-[var(--space-2)] lg:mx-0 lg:grid lg:grid-cols-6 lg:gap-[var(--space-5)] lg:overflow-visible lg:px-0 lg:pb-0">
          {items.map(({ genre, covers }) => {
            const current = genre.slug === active;
            return (
              <li key={genre.slug} className="relative w-[40vw] max-w-[12.5rem] shrink-0 snap-start sm:w-[28vw] lg:w-auto lg:max-w-none">
                <Link
                  href={discoverHref(params, { genre: genre.slug })}
                  aria-current={current ? "page" : undefined}
                  className="rail-item block no-underline"
                >
                  <span className="rail-item__display" aria-hidden="true">
                    {covers.slice(0, 3).map((book, i) => (
                      <TileCover
                        key={book.slug}
                        coverKey={book.coverKey}
                        title={book.title}
                        sizes="(min-width: 1024px) 5.5vw, 15vw"
                        className={`rail-cover rail-cover--${i}`}
                      />
                    ))}
                  </span>
                  <span className="mt-[var(--space-3)] flex items-baseline justify-between gap-[var(--space-2)]">
                    <span className="rail-item__name type-label text-[0.6875rem] text-[var(--fg)]">{genre.name}</span>
                    <span className="text-[0.75rem] tabular-nums text-[var(--fg-subtle)]">
                      {genre.bookCount.toLocaleString("en")}
                      <span className="sr-only"> books</span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {genres.length > 0 && (
        // Open by default when the current genre is not on the rail, so its place in the
        // index is visible.
        <details className="genre-index mt-[var(--space-5)]" open={activeOffRail || undefined}>
          <summary className="type-label inline-flex min-h-[44px] cursor-pointer list-none items-center gap-[var(--space-2)] text-[0.6875rem] text-[var(--fg)]">
            <span className="link-draw">All {genres.length} genres</span>
            <span aria-hidden="true" className="genre-index__mark">+</span>
          </summary>
          <ul className="m-0 mt-[var(--space-3)] grid list-none grid-cols-2 gap-x-[var(--space-6)] border-t border-[var(--rule)] p-0 pt-[var(--space-4)] sm:grid-cols-3 lg:grid-cols-5">
            <li>
              <Link
                href={discoverHref(params, { genre: undefined })}
                aria-current={!active ? "page" : undefined}
                className="index-link flex min-h-[40px] items-baseline justify-between gap-[var(--space-3)] border-b border-[var(--rule)] py-[var(--space-2)] text-[0.875rem] text-[var(--fg)] no-underline"
              >
                <span>All genres</span>
              </Link>
            </li>
            {genres.map((genre) => (
              <li key={genre.slug}>
                <Link
                  href={discoverHref(params, { genre: genre.slug })}
                  aria-current={genre.slug === active ? "page" : undefined}
                  className="index-link flex min-h-[40px] items-baseline justify-between gap-[var(--space-3)] border-b border-[var(--rule)] py-[var(--space-2)] text-[0.875rem] text-[var(--fg)] no-underline"
                >
                  <span>{genre.name}</span>
                  <span className="text-[0.75rem] tabular-nums text-[var(--fg-subtle)]">
                    {genre.bookCount.toLocaleString("en")}
                    <span className="sr-only"> books</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </nav>
  );
}
