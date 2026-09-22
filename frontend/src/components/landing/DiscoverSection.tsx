import Link from "next/link";
import { photograph } from "@/content/photography";
import type { BookPage, CatalogueStats, Genre } from "@/lib/api";
import { CoverPrint } from "../CoverPrint";
import { Reveal } from "../motion/Reveal";
import { Photograph } from "../Photograph";
import { SectionLabel } from "../SectionHeader";
import { Leaf } from "./Leaf";
import { SectionEdge } from "./SectionEdge";

/**
 * 02 Discover, in the library.
 *
 * Deep forest rising out of the hero along a stitched wave. The old library (shelves and
 * a marble bust) fills the right of the chapter and dissolves into the green; on the
 * left, the real search, prefilled with a misspelling, and the catalogue's real answer
 * set as a row of books. The genres run along the foot.
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
  const results = typo?.items.slice(0, 4) ?? [];
  const photo = photograph("library-bust");

  return (
    <section id="discover" data-surface="forest" aria-labelledby="discover-heading" className="chapter [--edge-h:88px] lg:min-h-[100svh]">
      <SectionEdge shape="wave" />

      <div className="absolute inset-0 overflow-hidden">
        {/* The library moves a little slower than the page, so the room has depth. */}
        <div className="drift absolute inset-y-[-24px] right-0 w-full lg:w-[58%]" style={{ ["--drift" as string]: "-14px" }}>
        <figure className="reveal-up discover-photo absolute inset-0 m-0">
          <Photograph
            id="library-bust"
            art={{ id: "library-bust-tall", media: "(max-width: 1023.98px)", sizes: "100vw" }}
            sizes="58vw"
            className="block h-full"
            imgClassName="h-full w-full object-cover object-[64%_45%]"
          />
          <figcaption className="type-caption absolute bottom-[11rem] right-[var(--gutter)] hidden text-[0.8125rem] text-[#a6aaa1] lg:block">
            {photo.caption}
          </figcaption>
          <div aria-hidden="true" className="library-light" />
        </figure>
        </div>
      </div>

      <div className="page-frame relative flex flex-col pb-[calc(88px+var(--space-8))] pt-[var(--space-16)] lg:min-h-[100svh] lg:pt-[7rem]">
        <Reveal className="max-w-[40rem]">
          <SectionLabel number="02" label="Discover" />
          <h2 id="discover-heading" className="mt-[var(--space-6)] font-serif text-[clamp(2.5rem,4.4vw,4.25rem)] font-[380] leading-[1.02] tracking-[-0.025em]">
            Find the book,
            <br />
            even when you
            <br />
            misspell it.
          </h2>
        </Reveal>

        <p aria-hidden="true" className="hand absolute right-[calc(var(--gutter)+3rem)] top-[8rem] hidden rotate-[-5deg] text-[1.75rem] text-[#d8d4c8] lg:block">
          Search {stats ? stats.books.toLocaleString("en") : ""} books
        </p>

        <Reveal delay={0.08} className="mt-[var(--space-10)] w-full max-w-[42rem]">
          <form role="search" action="/discover" method="get" className="hero-search">
            <label htmlFor="landing-search" className="sr-only">Search books, authors or ISBN</label>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
            <input id="landing-search" name="q" type="search" defaultValue={typoQuery} placeholder="Title, author or ISBN" autoComplete="off" />
            <button type="submit">Search</button>
          </form>
          {typo?.correctedFrom && (
            <p className="mt-[var(--space-3)] text-[0.8125rem] text-[var(--fg-muted)]">
              Showing results for a close match to &ldquo;{typo.correctedFrom}&rdquo;
            </p>
          )}
        </Reveal>

        {results.length > 0 && (
          <Reveal className="unfold mt-[var(--space-10)]">
            <ul className="m-0 grid list-none grid-cols-1 gap-x-[var(--space-8)] gap-y-[var(--space-5)] p-0 sm:grid-cols-2 lg:w-[62%] lg:grid-cols-4">
              {results.map((book, i) => (
                <li key={book.slug} className="unfold__item" style={{ ["--i" as string]: i }}>
                  <Link href={`/book/${book.slug}`} className="result-link">
                    <CoverPrint slug={book.slug} title={book.title} authors={book.authors} coverKey={book.coverKey} width="5.125rem" sizes="5.25rem" link={false} />
                    <span className="result-link__text min-w-0">
                      <span className="block font-serif text-[1rem] leading-tight">{book.title}</span>
                      <span className="mt-[2px] block text-[0.8125rem] text-[var(--fg-muted)]">{book.authors[0]}</span>
                      <span aria-hidden="true" className="result-link__arrow mt-[var(--space-3)] inline-block text-[var(--fg-muted)]">→</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        {genres && genres.length > 0 && (
          <Reveal delay={0.2} className="relative mt-auto pt-[var(--space-12)]">
            <nav aria-label="Browse by genre" className="flex flex-col gap-[var(--space-2)] border-t border-[var(--rule)] pt-[var(--space-4)] lg:flex-row lg:items-baseline lg:gap-[var(--space-8)]">
              <h3 className="type-label shrink-0 text-[var(--fg-subtle)]">Browse by genre</h3>
              <ul className="m-0 flex min-w-0 flex-1 list-none flex-wrap gap-x-[var(--space-6)] gap-y-[var(--space-2)] p-0">
                {genres.slice(0, 8).map((genre) => (
                  <li key={genre.slug}>
                    <Link href={`/discover?genre=${genre.slug}`} className="link-rule inline-flex min-h-[32px] items-center gap-[var(--space-2)] text-[0.875rem] text-[var(--fg)]">
                      {genre.name}
                      <span className="text-[var(--fg-subtle)] [font-variant-numeric:tabular-nums]">{genre.bookCount.toLocaleString("en")}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/discover" className="link-rule inline-flex min-h-[32px] shrink-0 items-center gap-[var(--space-2)] text-[0.875rem] text-[var(--fg)]">
                See all <span aria-hidden="true">→</span>
              </Link>
            </nav>
          </Reveal>
        )}
      </div>

      {/* A leaf from the reading table below reaches up into the library. */}
      <Leaf width="12rem" rotate={-140} className="crossing bottom-[-6.5rem] right-[6%] hidden md:block" breeze={{ x: 5, y: -2, r: -1.25, d: 21, delay: 3 }} />
    </section>
  );
}
