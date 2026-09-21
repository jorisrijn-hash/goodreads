import Link from "next/link";
import type { CatalogueStats } from "@/lib/api";
import { DemoButton } from "../DemoButton";
import { Ledger } from "../Ledger";
import { Photograph } from "../Photograph";
import { HeroShelf, type ShelfBook } from "./HeroShelf";

/**
 * 01 — the hero.
 *
 * Left, the thesis and the ways in; right, real books standing on a ledge in warm light.
 * The text settles in CSS on first paint; the books rise after it, through Motion.
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
    <section data-surface="ivory" aria-labelledby="hero-heading" className="relative overflow-hidden">
      <div className="page-frame grid grid-cols-[minmax(0,1fr)] lg:min-h-[calc(100svh-68px)] lg:grid-cols-12 lg:items-center">
        <div className="relative z-10 pb-[var(--space-10)] pt-[var(--space-12)] lg:col-span-6 lg:py-[var(--space-16)] xl:col-span-5">
          <p className="seq type-label text-[var(--fg-subtle)]" style={{ ["--i" as string]: 0 }}>
            A reading tracker, redesigned
          </p>

          {/* The breaks are authored: three short lines read as a statement, where the
              browser's own break would leave "life." alone on the last line. */}
          <h1
            id="hero-heading"
            className="mt-[var(--space-6)] font-serif text-[clamp(3rem,6.2vw,6rem)] font-[360] leading-[0.98] tracking-[-0.035em]"
          >
            {["A better home", "for your", "reading life."].map((line, i) => (
              <span key={line} className="seq-line" style={{ ["--i" as string]: i }}>
                <span>{line}</span>
              </span>
            ))}
          </h1>

          <p
            className="seq mt-[var(--space-8)] max-w-[40ch] text-[1.0625rem] leading-[1.65] text-[var(--fg-muted)] sm:text-[1.125rem]"
            style={{ ["--i" as string]: 4 }}
          >
            Discover books worth reading, save the ones you want, and keep track of where each
            one stands — all in one place.
          </p>

          <div className="seq mt-[var(--space-8)] flex flex-wrap items-start gap-[var(--space-3)]" style={{ ["--i" as string]: 5 }}>
            <Link
              href="/signup"
              className="inline-flex min-h-[52px] items-center justify-center whitespace-nowrap
                         rounded-[var(--radius-input)] bg-[var(--forest)] px-[var(--space-8)]
                         text-base font-medium text-[var(--ivory)] no-underline
                         transition-colors duration-[var(--motion-fast)] hover:bg-[var(--forest-hover)]"
            >
              Create an account
            </Link>
            <DemoButton label="Explore demo" size="large" />
          </div>

          {stats && (
            <div className="seq mt-[var(--space-12)] max-w-[30rem]" style={{ ["--i" as string]: 8 }}>
              <Ledger
                items={[
                  { label: "Books", value: stats.books },
                  { label: "Authors", value: stats.authors },
                  { label: "Genres", value: stats.genres },
                ]}
              />
            </div>
          )}

          {/* Phones: the books come after the words, never instead of them. */}
          {mobileBooks.length > 0 && (
            <figure className="relative -mx-[var(--gutter)] mt-[var(--space-10)] h-[20rem] overflow-hidden lg:hidden">
              <Photograph
                id="wall-light"
                decorative
                sizes="100vw"
                className="absolute inset-0"
                imgClassName="h-full w-full object-cover object-[50%_30%]"
              />
              <HeroShelf
                books={mobileBooks}
                sizes="45vw"
                ledge={{ left: "0%", right: "0%", bottom: "14%" }}
                startDelay={0.6}
                interactive={false}
              />
              <figcaption data-surface="ivory" className="type-label absolute left-[var(--gutter)] top-[var(--space-4)] px-[var(--space-2)] py-[var(--space-1)]">
                Selected from the catalogue
              </figcaption>
            </figure>
          )}
        </div>
      </div>

      {/* Desktop: the scene takes the right of the page and runs off its edge. */}
      {books.length > 0 && (
        <figure className="absolute inset-y-0 right-0 hidden w-[52%] [container-type:inline-size] lg:block">
          <Photograph
            id="wall-light"
            decorative
            priority
            sizes="52vw"
            className="absolute inset-0"
            imgClassName="h-full w-full object-cover object-[50%_35%]"
          />
          <HeroShelf books={books} sizes="14rem" ledge={{ left: "3%", right: "0%", bottom: "17%" }} />
          {/* An archive label, on its own ground so it stays legible over the light. */}
          <figcaption data-surface="ivory" className="absolute bottom-[var(--space-6)] left-[var(--space-8)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--fg-muted)]">
            <span className="type-label text-[var(--fg)]">Selected</span>
            <span className="ml-[var(--space-3)] text-[0.8125rem]">
              {books.length} books from the catalogue
            </span>
          </figcaption>
        </figure>
      )}
    </section>
  );
}
