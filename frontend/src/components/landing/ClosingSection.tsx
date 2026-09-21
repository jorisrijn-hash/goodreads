import Link from "next/link";
import { DemoButton } from "../DemoButton";
import { Reveal } from "../motion/Reveal";
import { SectionHeader } from "../SectionHeader";

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

/** 05 — the way in, and the plain answers, back on ivory. */
export function ClosingSection() {
  return (
    <section data-surface="ivory" aria-labelledby="closing-heading">
      <div className="page-frame grid grid-cols-[minmax(0,1fr)] gap-y-[var(--space-12)] py-[var(--space-16)] lg:grid-cols-12 lg:gap-x-[var(--space-8)] lg:py-[7.5rem]">
        <Reveal className="lg:col-span-5">
          <SectionHeader number="05" label="Start">
            <span id="closing-heading">Try it with the demo account.</span>
          </SectionHeader>
          <p className="mt-[var(--space-6)] max-w-[40ch] text-[1.0625rem] leading-[1.65] text-[var(--fg-muted)]">
            One click, no sign-up. Or create an account for a library of your own.
          </p>
          <div className="mt-[var(--space-8)] flex flex-wrap items-start gap-[var(--space-3)]">
            <DemoButton label="Explore the demo account" size="large" />
            <Link
              href="/signup"
              className="inline-flex min-h-[52px] items-center justify-center whitespace-nowrap
                         rounded-[var(--radius-input)] bg-[var(--forest)] px-[var(--space-8)]
                         text-base font-medium text-[var(--ivory)] no-underline
                         transition-colors duration-[var(--motion-fast)] hover:bg-[var(--forest-hover)]"
            >
              Create an account
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="lg:col-span-6 lg:col-start-7">
          <h3 className="type-label text-[var(--fg-subtle)]">Questions</h3>
          <div className="mt-[var(--space-4)] border-b border-[var(--rule)]">
            {QUESTIONS.map(({ q, a }) => (
              <details key={q} className="faq group border-t border-[var(--rule)]">
                <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-[var(--space-4)] font-serif text-[1.25rem] text-[var(--fg)]">
                  {q}
                  <span aria-hidden="true" className="text-[var(--fg-subtle)] transition-transform duration-[var(--motion-base)] group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-[58ch] pb-[var(--space-6)] leading-[1.65] text-[var(--fg-muted)]">{a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
