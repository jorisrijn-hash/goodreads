import Link from "next/link";
import type { CatalogueStats } from "@/lib/api";
import { DemoButton } from "../DemoButton";
import { CoverCollage, type CollageBook } from "./CoverCollage";

/**
 * 01 The hero: typography and real covers on paper, nothing else.
 *
 * Everything on the left hangs from one vertical edge. On the right, the selected covers
 * lie as a loose mosaic that runs off the edge of the page, resting on a single hairline,
 * with a small caption in the margin saying what they are.
 */
export function LandingHero({
  books,
  mobileBooks,
  stats,
}: {
  books: CollageBook[];
  mobileBooks: CollageBook[];
  stats: CatalogueStats | null;
}) {
  return (
    <section data-surface="ivory" aria-labelledby="hero-heading" className="hero relative z-20 [overflow-x:clip]">
      <div className="page-frame relative z-10 grid grid-cols-[minmax(0,1fr)] lg:min-h-[min(calc(100svh-68px),56rem)] lg:grid-cols-12 lg:items-center">
        <div className="pb-[var(--space-10)] pt-[var(--space-12)] lg:col-span-6 lg:py-[var(--space-16)]">
          <p className="seq type-label text-[var(--fg-subtle)]" style={{ ["--i" as string]: 0 }}>
            A reading tracker, redesigned
          </p>

          <h1
            id="hero-heading"
            className="mt-[var(--space-6)] font-serif text-[clamp(2.5rem,4.1vw,4.25rem)] font-[360] leading-[1.02] tracking-[-0.03em]"
          >
            {["A better home", "for your reading life."].map((line, i) => (
              <span key={line} className="seq-line" style={{ ["--i" as string]: i }}>
                <span>{line}</span>
              </span>
            ))}
          </h1>

          <p
            className="seq mt-[var(--space-8)] max-w-[34ch] font-serif text-[1.1875rem] leading-[1.6] text-[var(--fg-muted)]"
            style={{ ["--i" as string]: 3 }}
          >
            Discover books worth reading, save the ones you want, and keep track of where
            each one stands, all in one place.
          </p>

          <div className="seq mt-[var(--space-8)] flex flex-wrap items-start gap-[var(--space-3)]" style={{ ["--i" as string]: 4 }}>
            <Link href="/signup" className="action action--primary">
              Create an account <span aria-hidden="true" className="action__arrow">→</span>
            </Link>
            <DemoButton label="Explore demo" size="large" />
          </div>

          {stats && (
            <dl className="seq mt-[var(--space-12)] flex max-w-[34rem] flex-wrap gap-x-[var(--space-8)] gap-y-[var(--space-2)] border-t border-[var(--rule)] pt-[var(--space-4)]" style={{ ["--i" as string]: 6 }}>
              {([["Books", stats.books], ["Authors", stats.authors], ["Genres", stats.genres]] as const).map(([label, value]) => (
                <div key={label} className="flex items-baseline gap-[var(--space-2)]">
                  <dd className="m-0 text-[0.9375rem] font-medium text-[var(--fg)] [font-variant-numeric:tabular-nums]">{value.toLocaleString("en")}</dd>
                  <dt className="type-label text-[var(--fg-subtle)]">{label}</dt>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      {/* Desktop mosaic: after the copy in the document, so the copy's actions come
          first in keyboard order. */}
      {books.length > 0 && (
        <div className="hero-collage absolute bottom-[10%] top-[9%] z-20 hidden lg:block">
          <CoverCollage books={books} sizes="15rem" media="(min-width: 1024px)" />
          <div aria-hidden="true" className="absolute bottom-0 left-0 right-0 h-px bg-[var(--rule-strong)] opacity-60" />
          <p className="absolute left-0 top-[calc(100%+12px)] flex items-baseline gap-[var(--space-3)] text-[var(--fg-subtle)]">
            <span className="type-label text-[var(--fg)]">Selected / 0{books.length}</span>
            <span className="type-caption text-[0.875rem]">Chosen from the catalogue for the page.</span>
          </p>
        </div>
      )}

      {/* Phones: after the words, never instead of them. */}
      {mobileBooks.length > 0 && (
        <div className="page-frame pb-[var(--space-12)] lg:hidden">
          <div className="relative h-[20rem] sm:h-[26rem]">
            <CoverCollage books={mobileBooks} sizes="40vw" interactive={false} priority={false} startDelay={0.5} media="(max-width: 1023.98px)" />
            <div aria-hidden="true" className="absolute bottom-0 left-0 right-0 h-px bg-[var(--rule-strong)] opacity-60" />
          </div>
          <p className="mt-[var(--space-3)] type-label text-[var(--fg)]">Selected / 0{mobileBooks.length}</p>
        </div>
      )}
    </section>
  );
}
