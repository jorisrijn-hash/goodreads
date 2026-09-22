import Link from "next/link";
import type { CatalogueStats } from "@/lib/api";
import { DemoButton } from "../DemoButton";
import { CoverCollage, type CollageBook } from "./CoverCollage";
import { Leaf } from "./Leaf";

/**
 * 01 The hero.
 *
 * Left, one vertical edge: the statement, the ways in, the size of the catalogue. Right,
 * four real covers standing large and overlapping in afternoon light, with a leaf at the
 * corner of the page and a scrap of a real page lying at their foot. The scrap crosses
 * the stitched edge into the next chapter.
 */
export function LandingHero({
  books,
  mobileBooks,
  stats,
  fragment,
}: {
  books: CollageBook[];
  mobileBooks: CollageBook[];
  stats: CatalogueStats | null;
  /** Real opening text of a selected book, set on the paper scrap. */
  fragment: { title: string; text: string } | null;
}) {
  return (
    <section id="hero" data-surface="ivory" aria-labelledby="hero-heading" className="chapter hero">
      {/* Light through a window: a leaf's shadow drifting over the paper. */}
      {/* Window light moving across the paper, and a leaf's shadow within it. */}
      <div aria-hidden="true" className="daylight" style={{ ["--lx" as string]: "16px", ["--ly" as string]: "6px", ["--ld" as string]: "28s" }} />
      <Leaf shadow priority width="26rem" rotate={-18} className="right-[16%] top-[4%] hidden lg:block" style={{ ["--sx" as string]: "19px", ["--sy" as string]: "11px", ["--sd" as string]: "26s", ["--so" as string]: "0.11" }} />

      <div className="page-frame relative z-10 grid grid-cols-[minmax(0,1fr)] lg:min-h-[min(calc(100svh-68px),58rem)] lg:grid-cols-12 lg:items-center">
        <div className="pb-[var(--space-10)] pt-[var(--space-12)] lg:col-span-5 lg:pb-[var(--space-16)] lg:pt-[var(--space-10)]">
          <p className="seq flex items-center gap-[var(--space-3)] text-[var(--fg-subtle)]" style={{ ["--i" as string]: 0 }}>
            <span className="type-folio">01</span>
            <span aria-hidden="true" className="h-px w-8 bg-[var(--rule-strong)]" />
            <span className="type-label">A more thoughtful way to read</span>
          </p>

          <h1 id="hero-heading" className="mt-[var(--space-6)] font-serif text-[clamp(3rem,5.6vw,5.5rem)] font-[380] leading-[1] tracking-[-0.03em]">
            {["A better home", "for your", "reading life."].map((line, i) => (
              <span key={line} className="seq-line" style={{ ["--i" as string]: i }}>
                <span>{line}</span>
              </span>
            ))}
          </h1>

          <p className="seq mt-[var(--space-6)] max-w-[40ch] text-[1.0625rem] leading-[1.65] text-[var(--fg-muted)]" style={{ ["--i" as string]: 3 }}>
            Discover books worth reading, save the ones you want, and keep track of where each
            one stands, all in one place.
          </p>

          <div className="seq mt-[var(--space-8)] flex flex-wrap items-start gap-[var(--space-3)]" style={{ ["--i" as string]: 4 }}>
            <Link href="/signup" className="action action--primary">
              Get started, it&rsquo;s free <span aria-hidden="true" className="action__arrow">→</span>
            </Link>
            <DemoButton label="Explore demo" size="large" />
          </div>

          {stats && (
            <dl className="seq mt-[var(--space-10)] flex divide-x divide-[var(--rule)]" style={{ ["--i" as string]: 6 }}>
              {([["Books", stats.books], ["Authors", stats.authors], ["Genres", stats.genres]] as const).map(([label, value]) => (
                <div key={label} className="flex flex-col-reverse px-[var(--space-6)] first:pl-0">
                  <dt className="type-label mt-[var(--space-1)] text-[var(--fg-subtle)]">{label}</dt>
                  <dd className="m-0 font-serif text-[1.75rem] leading-none tracking-[-0.01em] [font-variant-numeric:lining-nums_tabular-nums]">{value.toLocaleString("en")}</dd>
                </div>
              ))}
            </dl>
          )}

          <a href="#discover" className="seq link-rule mt-[var(--space-12)] hidden items-center gap-[var(--space-3)] border-l border-[var(--rule-strong)] pl-[var(--space-3)] text-[var(--fg-subtle)] lg:inline-flex" style={{ ["--i" as string]: 7 }}>
            <span className="type-label">Scroll for more</span> <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      {books.length > 0 && (
        <div className="hero-collage absolute bottom-0 top-[8%] z-20 hidden lg:block [container-type:inline-size]">
          {/* The floor the books stand on: a soft contact shadow, nothing drawn. */}
          <div aria-hidden="true" className="absolute bottom-[1%] left-0 right-[6%] h-[14%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(25,24,21,0.2),rgba(25,24,21,0))] blur-[6px]" />
          <CoverCollage books={books} sizes="17rem" media="(min-width: 1024px)" />
          <p aria-hidden="true" className="hand absolute left-[18%] top-[14%] rotate-[-5deg] text-[1.4375rem] text-[var(--ink-70)] opacity-80">
            Selected / 0{books.length} <span className="ml-1 inline-block rotate-[30deg]">↘</span>
          </p>
          <Leaf width="13rem" rotate={-24} className="left-[70%] top-[4%] z-[25]" breeze={{ x: 6, y: 3, r: 1.35, d: 16 }} />
        </div>
      )}

      {/* A scrap of the real first page, lying at the books' feet and over the edge. */}
      {fragment && (
        <div className="crossing drift bottom-[-4rem] left-[calc(43%+5rem)] hidden w-[19rem] lg:block" style={{ ["--drift" as string]: "8px" }}>
          <div className="breeze" style={{ ["--bx" as string]: "2px", ["--by" as string]: "-1px", ["--br" as string]: "0.45deg", ["--bd" as string]: "24s", ["--borigin" as string]: "0 0" }}>
            <div className="paper-fragment relative rotate-[-3deg]">
              <p className="m-0 mb-[6px] font-sans text-[8px] font-semibold uppercase tracking-[0.18em] text-[#7a7266]">{fragment.title}</p>
              <p className="m-0 [column-count:2] [column-gap:14px]">{fragment.text}</p>
            </div>
          </div>
        </div>
      )}

      {/* Phones: the covers follow the words. */}
      {mobileBooks.length > 0 && (
        <div className="page-frame pb-[var(--space-16)] lg:hidden">
          <div className="relative h-[19rem] sm:h-[26rem]">
            <CoverCollage books={mobileBooks} sizes="40vw" interactive={false} priority={false} startDelay={0.5} media="(max-width: 1023.98px)" />
            <Leaf width="8rem" rotate={-24} className="right-[-1.5rem] top-[-2rem] z-[25]" breeze={{ x: 5, y: 2, r: 1.15, d: 18 }} />
          </div>
          <p aria-hidden="true" className="hand mt-[var(--space-2)] text-[1.375rem] text-[var(--ink-70)]">Selected / 0{mobileBooks.length}</p>
        </div>
      )}
    </section>
  );
}
