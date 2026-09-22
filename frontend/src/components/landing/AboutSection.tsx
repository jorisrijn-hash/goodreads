import { Reveal } from "../motion/Reveal";

const QUESTIONS = [
  { q: "What is this?", a: "An independent redesign of a book-tracking product, built end to end as a design and engineering case study: a Next.js frontend, a Spring Boot API and a PostgreSQL catalogue." },
  { q: "Where does the book data come from?", a: "Open Library, whose catalogue data is public domain (CC0). The books, authors, descriptions and covers here were imported from it. Nothing is taken from Goodreads." },
  { q: "Is this affiliated with Goodreads?", a: "No. It is not affiliated with Goodreads or Amazon, uses no Goodreads data, and accounts here are unrelated to Goodreads accounts." },
  { q: "What is the demo account?", a: "A shared account you can enter with one click, with no email or password. Anyone can use it at the same time, so what you save there may be changed by someone else. Create your own account for a library that stays yours." },
];

/** About the project: what it is, where its data comes from, what the demo is. */
export function AboutSection() {
  return (
    <section id="about" data-surface="ivory" aria-labelledby="about-heading" className="chapter border-t border-[var(--rule)]">
      <div className="page-frame grid grid-cols-[minmax(0,1fr)] gap-y-[var(--space-8)] py-[var(--space-16)] lg:grid-cols-12 lg:gap-x-[var(--space-8)]">
        <Reveal className="lg:col-span-4">
          <h2 id="about-heading" className="type-label text-[var(--fg)]">About this project</h2>
          <p className="mt-[var(--space-4)] max-w-[36ch] font-serif text-[1.0625rem] leading-[1.6] text-[var(--fg-muted)]">
            An independent redesign and engineering case study. Not affiliated with Goodreads or
            Amazon. Catalogue and covers from Open Library (CC0).
          </p>
        </Reveal>
        <Reveal delay={0.06} className="lg:col-span-7 lg:col-start-6">
          {QUESTIONS.map(({ q, a }) => (
            <details key={q} className="faq group border-b border-[var(--rule)] first:border-t">
              <summary className="flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-[var(--space-4)] font-serif text-[1.1875rem] [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden="true" className="text-[1.25rem] text-[var(--fg-subtle)] transition-transform duration-[220ms] group-open:rotate-45">+</span>
              </summary>
              <p className="max-w-[60ch] pb-[var(--space-5)] text-[0.9375rem] leading-[1.65] text-[var(--fg-muted)]">{a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
