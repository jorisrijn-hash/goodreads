import Link from "next/link";
import type { CatalogueStats } from "@/lib/api";
import { DemoButton } from "../DemoButton";
import { Photograph } from "../Photograph";
import { HeroShelf, type ShelfBook } from "./HeroShelf";

/**
 * 01 — the hero: a still life, not a split screen.
 *
 * The warm wall runs behind most of the page and dissolves into it under the copy (a
 * mask, not a painted gradient). The books stand on a stone plinth that runs off the
 * right edge and whose front face drops over the top of the next section, so the page
 * continues rather than ending in a straight line.
 */
export function LandingHero({
  books,
  mobileBooks,
  stats,
}: {
  books: ShelfBook[];
  mobileBooks: ShelfBook[];
  stats: CatalogueStats | null;
}) {
  return (
    <section data-surface="ivory" aria-labelledby="hero-heading" className="hero relative z-20 [overflow-x:clip]">
      <div className="page-frame relative z-10 grid grid-cols-[minmax(0,1fr)] lg:min-h-[calc(100svh-68px)] lg:grid-cols-12 lg:items-center lg:pb-[var(--plinth-top)]">
        <div className="pb-[var(--space-10)] pt-[var(--space-12)] lg:col-span-5 lg:pb-[var(--space-10)] lg:pt-[var(--space-8)]">
          <p className="seq type-label text-[var(--fg-subtle)]" style={{ ["--i" as string]: 0 }}>
            A reading tracker, redesigned
          </p>

          {/* Authored breaks, with the middle line set in: the statement reads as three
              beats rather than a paragraph that happens to be large. */}
          <h1
            id="hero-heading"
            className="mt-[var(--space-6)] font-serif text-[clamp(3rem,5.3vw,5.25rem)] font-[360] leading-[0.98] tracking-[-0.035em]"
          >
            {["A better home", "for your", "reading life."].map((line, i) => (
              <span key={line} className={`seq-line ${i === 1 ? "pl-[0.6em]" : ""}`} style={{ ["--i" as string]: i }}>
                <span>{line}</span>
              </span>
            ))}
          </h1>

          <p
            className="seq mt-[var(--space-8)] max-w-[34ch] text-[1.0625rem] leading-[1.65] text-[var(--fg-muted)] sm:text-[1.125rem]"
            style={{ ["--i" as string]: 4 }}
          >
            Discover books worth reading, save the ones you want, and keep track of where
            each one stands — all in one place.
          </p>

          <div className="seq mt-[var(--space-8)] flex flex-wrap items-start gap-[var(--space-3)]" style={{ ["--i" as string]: 5 }}>
            <Link href="/signup" className="action action--primary">
              Create an account <span aria-hidden="true" className="action__arrow">→</span>
            </Link>
            <DemoButton label="Explore demo" size="large" />
          </div>

          {/* Quiet facts, one line: the size of what you would be searching. */}
          {stats && (
            <p className="seq mt-[var(--space-10)] flex flex-wrap items-baseline gap-x-[var(--space-5)] gap-y-[var(--space-1)] text-[0.8125rem] text-[var(--fg-subtle)]" style={{ ["--i" as string]: 8 }}>
              {([["books", stats.books], ["authors", stats.authors], ["genres", stats.genres]] as const).map(([label, value]) => (
                <span key={label}>
                  <span className="font-serif text-[1.125rem] text-[var(--fg)] [font-variant-numeric:lining-nums_tabular-nums]">{value.toLocaleString("en")}</span>{" "}
                  {label}
                </span>
              ))}
              <span>from Open Library</span>
            </p>
          )}
        </div>
      </div>

      {/* Desktop scene: after the copy in the document, so the copy's actions come first
          in keyboard order; positioned behind and beside it. */}
      {books.length > 0 && (
        <div className="pointer-events-none absolute inset-0 hidden lg:block">
          <Photograph
            id="wall-wide"
            decorative
            priority
            media="(min-width: 1024px)"
            sizes="75vw"
            className="hero-wall hero-scene-wall absolute bottom-[var(--plinth-top)] right-0 top-0"
            imgClassName="h-full w-full object-cover object-[60%_40%]"
          />
          <div className="plinth hero-scene-plinth absolute right-0" />
          <div
            className="hero-scene-stage pointer-events-auto absolute z-20 bottom-[var(--plinth-top)] right-[-3vw] top-[18%] [container-type:inline-size]"
          >
            <HeroShelf books={books} sizes="16rem" ledge={{ bottom: "0%" }} media="(min-width: 1024px)" />
          </div>
          {/* Set into the stone, like a museum label. */}
          <p className="plinth-label hero-scene-label absolute text-[var(--ink-70)]">
            <span className="type-label text-[var(--ink)]">Selected</span>
            <span className="mx-[var(--space-3)] inline-block h-px w-6 translate-y-[-3px] bg-[var(--ink-60)]" aria-hidden="true" />
            <span className="text-[0.8125rem]">{books.length} books from the catalogue</span>
          </p>
        </div>
      )}

      {/* Phones: the books come after the words, standing on the same stone. */}
      {mobileBooks.length > 0 && (
        <figure className="relative m-0 h-[21rem] lg:hidden">
          <Photograph
            id="wall-light"
            decorative
            sizes="100vw"
            media="(max-width: 1023.98px)"
            className="hero-wall hero-wall--mobile absolute inset-x-0 bottom-[var(--plinth-top)] top-0"
            imgClassName="h-full w-full object-cover object-[50%_30%]"
          />
          <div className="plinth absolute inset-x-0" />
          <div className="absolute inset-x-0 bottom-[var(--plinth-top)] top-0">
            <HeroShelf books={mobileBooks} sizes="40vw" ledge={{ bottom: "0%" }} startDelay={0.6} interactive={false} priority={false} media="(max-width: 1023.98px)" />
          </div>
          <figcaption className="plinth-label absolute left-[var(--gutter)] text-[var(--ink-70)]">
            <span className="type-label text-[var(--ink)]">Selected</span>
            <span className="ml-[var(--space-3)] text-[0.8125rem]">from the catalogue</span>
          </figcaption>
        </figure>
      )}
    </section>
  );
}
