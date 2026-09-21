import Link from "next/link";
import { photograph } from "@/content/photography";
import type { BookPage, CatalogueStats, Genre } from "@/lib/api";
import { CoverPrint } from "../CoverPrint";
import { Reveal } from "../motion/Reveal";
import { Photograph } from "../Photograph";
import { SectionLabel } from "../SectionHeader";

/**
 * 02 Discover: the search field is the object.
 *
 * Matte forest, with the library as a tall crop down the right edge rather than a
 * backdrop; the search field runs across onto it. It is the real search, a plain GET
 * form, prefilled with a misspelling. The catalogue's actual answer is set beneath it
 * as numbered covers with their titles in type, and the genres run along the foot.
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
  const photo = photograph("library-vault");

  return (
    <section data-surface="forest" aria-labelledby="discover-heading" className="forest-reveal relative z-10 overflow-hidden">
      {/* The library, as a strip of architecture down the right edge. */}
      <figure className="discover-strip absolute bottom-0 right-0 top-0 m-0 hidden w-[27%] lg:block">
        <Photograph id="library-vault" sizes="27vw" className="block h-full" imgClassName="h-full w-full object-cover object-[50%_30%]" />
        <figcaption className="type-caption absolute bottom-[var(--space-8)] left-[-1.75rem] origin-bottom-left -rotate-90 whitespace-nowrap text-[0.8125rem] text-[var(--fg-subtle)]">
          {photo.caption}
        </figcaption>
      </figure>

      <div className="page-frame relative pb-[var(--space-16)] pt-[calc(var(--space-16)+1rem)] lg:pb-[8rem] lg:pt-[8rem]">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-[var(--space-8)]">
          <Reveal className="lg:col-span-6">
            <SectionLabel number="02" label="Discover" />
            <h2 id="discover-heading" className="type-display-l mt-[var(--space-6)] max-w-[13ch]">
              Find the book, even when you misspell it.
            </h2>
          </Reveal>
          <Reveal delay={0.06} className="mt-[var(--space-6)] lg:col-span-3 lg:col-start-7 lg:mt-0 lg:self-end">
            <p className="max-w-[30ch] font-serif text-[1.0625rem] leading-[1.6] text-[var(--fg-muted)]">
              Search {stats ? `${stats.books.toLocaleString("en")} books` : "the catalogue"} by
              title, author or ISBN. Typos included, and it tells you when it corrected one.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="relative z-10 mt-[var(--space-12)] lg:w-[calc(83%+var(--gutter))]">
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
            <p className="mt-[var(--space-4)] flex flex-wrap items-baseline gap-x-[var(--space-4)] border-b border-[var(--rule)] pb-[var(--space-4)] text-[0.8125rem] text-[var(--fg-muted)] lg:w-[80%]">
              <span className="type-label text-[var(--fg)]">{typo.total} {typo.total === 1 ? "book" : "books"}</span>
              {typo.correctedFrom && <span>Showing results for a close match to “{typo.correctedFrom}”</span>}
            </p>
          )}
        </Reveal>

        {results.length > 0 && (
          <Reveal className="unfold mt-[var(--space-10)]">
            <ol className="m-0 flex list-none flex-wrap items-start gap-x-[clamp(1rem,4vw,3.5rem)] gap-y-[var(--space-8)] p-0 lg:w-[70%]">
              {results.map((book, i) => (
                <li key={book.slug} className="unfold__item w-[clamp(6.5rem,24vw,13rem)]" style={{ ["--i" as string]: i }}>
                  <CoverPrint
                    slug={book.slug}
                    title={book.title}
                    authors={book.authors}
                    coverKey={book.coverKey}
                    width="100%"
                    sizes="13rem"
                  />
                  <p className="mt-[var(--space-4)] border-t border-[var(--rule)] pt-[var(--space-3)]">
                    <span className="type-folio block text-[var(--fg-subtle)]">0{i + 1}</span>
                    <span className="mt-[var(--space-1)] block font-serif text-[1.125rem] leading-tight">{book.title}</span>
                    <span className="type-label mt-[var(--space-1)] block text-[var(--fg-subtle)]">{book.authors[0]}</span>
                  </p>
                </li>
              ))}
            </ol>
          </Reveal>
        )}

        {genres && genres.length > 0 && (
          <nav aria-label="Browse by genre" className="relative z-10 mt-[var(--space-16)] lg:w-[68%]">
            <h3 className="type-label text-[var(--fg-subtle)]">Browse by genre</h3>
            <ul className="genre-strip mt-[var(--space-3)] flex list-none overflow-x-auto border-y border-[var(--rule-strong)] p-0">
              {genres.map((genre) => (
                <li key={genre.slug} className="shrink-0 border-r border-[var(--rule)]">
                  <Link href={`/discover?genre=${genre.slug}`} className="flex min-h-[48px] items-center gap-[var(--space-4)] px-[var(--space-4)] text-[0.8125rem] text-[var(--fg)] no-underline transition-colors duration-[var(--motion-fast)] hover:bg-[var(--wash)]">
                    {genre.name}
                    <span className="text-[var(--fg-subtle)] [font-variant-numeric:tabular-nums]">{genre.bookCount.toLocaleString("en")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </section>
  );
}
