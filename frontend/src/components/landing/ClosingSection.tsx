import Link from "next/link";
import type { BookDetail } from "@/lib/api";
import { BookObject } from "../BookObject";
import { DemoButton } from "../DemoButton";
import { Reveal } from "../motion/Reveal";
import { SectionLabel } from "../SectionHeader";

const QUESTIONS = [
  {
    q: "What is this?",
    a: "An independent redesign of a book-tracking product, built end to end as a design and engineering case study: a Next.js frontend, a Spring Boot API and a PostgreSQL catalogue.",
  },
  {
    q: "Where does the book data come from?",
    a: "Open Library, whose catalogue data is public domain (CC0). The books, authors, descriptions and covers here were imported from it; nothing is scraped from Goodreads.",
  },
  {
    q: "Is this affiliated with Goodreads?",
    a: "No. It is not affiliated with Goodreads or Amazon, uses no Goodreads data, and accounts here are unrelated to Goodreads accounts.",
  },
  {
    q: "What is the demo account?",
    a: "A shared account you can enter with one click, with no email or password. Anyone can use it at the same time, so what you save there may be changed by someone else — create your own account for a library that stays yours.",
  },
];

/**
 * 05 — the way in, then plain answers.
 *
 * Centred and large, the one other place the display serif is used at full size, over a
 * short shelf of the same selected books that open the page — the page ends where it
 * began. The FAQ below opens with its height where the browser can animate it.
 */
export function ClosingSection({ books }: { books: BookDetail[] }) {
  const turns = [48, 22, -4, -24, -46];
  return (
    <section data-surface="ivory" aria-labelledby="closing-heading" className="relative">
      <div className="page-frame pb-[var(--space-16)] pt-[var(--space-16)] lg:pb-[7rem] lg:pt-[8rem]">
        <Reveal className="mx-auto max-w-[48rem] text-center">
          <SectionLabel number="05" label="Start" centered />
          <h2 id="closing-heading" className="type-display-l mx-auto mt-[var(--space-6)] max-w-[14ch] text-balance">
            Try it with the demo account.
          </h2>
          <p className="mx-auto mt-[var(--space-5)] max-w-[40ch] text-[1.0625rem] leading-[1.6] text-[var(--fg-muted)]">
            One click, no sign-up. Or create an account for a library of your own.
          </p>
          <div className="mt-[var(--space-8)] flex flex-wrap items-start justify-center gap-[var(--space-3)]">
            <DemoButton label="Explore the demo account" size="large" />
            <Link href="/signup" className="action action--primary">
              Create an account <span aria-hidden="true" className="action__arrow">→</span>
            </Link>
          </div>
        </Reveal>

        {books.length > 0 && (
          <Reveal delay={0.1} className="relative mx-auto mt-[var(--space-16)] max-w-[44rem]">
            <ul className="relative z-[2] m-0 flex list-none items-end justify-center gap-[clamp(0.25rem,2vw,1.5rem)] p-0">
              {books.slice(0, 5).map((book, i) => (
                <li key={book.slug} className="book-stage">
                  <BookObject
                    slug={book.slug}
                    title={book.title}
                    authors={book.authors}
                    coverKey={book.coverKey}
                    pageCount={book.pageCount}
                    width={i === 2 ? "clamp(3.75rem, 14vw, 8.5rem)" : "clamp(2.5rem, 11vw, 6.75rem)"}
                    turn={turns[i]}
                    sizes="8.5rem"
                  />
                </li>
              ))}
            </ul>
            <div aria-hidden="true" className="plinth plinth--small" />
          </Reveal>
        )}

        <div className="mt-[var(--space-16)] grid grid-cols-[minmax(0,1fr)] gap-y-[var(--space-6)] border-t border-[var(--rule)] pt-[var(--space-10)] lg:grid-cols-12 lg:gap-x-[var(--space-8)]">
          <div className="lg:col-span-4">
            <h3 className="type-label text-[var(--fg-subtle)]">Questions</h3>
            <p className="mt-[var(--space-3)] max-w-[28ch] text-[var(--fg-muted)]">Short answers about what this is and where it comes from.</p>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            {QUESTIONS.map(({ q, a }) => (
              <details key={q} className="faq group border-b border-[var(--rule)] first:border-t">
                <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-[var(--space-4)] font-serif text-[1.25rem] text-[var(--fg)] [&::-webkit-details-marker]:hidden">
                  {q}
                  <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--rule-strong)] text-[var(--fg-subtle)] transition-transform duration-[220ms] group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-[58ch] pb-[var(--space-6)] leading-[1.65] text-[var(--fg-muted)]">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
