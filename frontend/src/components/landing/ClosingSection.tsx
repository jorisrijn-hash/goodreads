import Link from "next/link";
import { photograph } from "@/content/photography";
import type { BookDetail } from "@/lib/api";
import { CoverPrint } from "../CoverPrint";
import { DemoButton } from "../DemoButton";
import { Reveal } from "../motion/Reveal";
import { Photograph } from "../Photograph";
import { SectionLabel } from "../SectionHeader";

const QUESTIONS = [
  {
    q: "What is this?",
    a: "An independent redesign of a book-tracking product, built end to end as a design and engineering case study: a Next.js frontend, a Spring Boot API and a PostgreSQL catalogue.",
  },
  {
    q: "Where does the book data come from?",
    a: "Open Library, whose catalogue data is public domain (CC0). The books, authors, descriptions and covers here were imported from it. Nothing is taken from Goodreads.",
  },
  {
    q: "Is this affiliated with Goodreads?",
    a: "No. It is not affiliated with Goodreads or Amazon, uses no Goodreads data, and accounts here are unrelated to Goodreads accounts.",
  },
  {
    q: "What is the demo account?",
    a: "A shared account you can enter with one click, with no email or password. Anyone can use it at the same time, so what you save there may be changed by someone else. Create your own account for a library that stays yours.",
  },
];

/**
 * 05 The way in, then the facts.
 *
 * Asymmetric, like the rest of the page: the call to action and a small shelf on the
 * left edge, a tall crop of the library's shelves on the right. Beneath, a dense note
 * about the project beside the questions.
 */
export function ClosingSection({ books }: { books: { book: BookDetail; ratio: number }[] }) {
  const photo = photograph("library-shelves");
  return (
    <section data-surface="ivory" aria-labelledby="closing-heading" className="relative [overflow-x:clip]">
      <div className="page-frame pb-[var(--space-16)] pt-[var(--space-16)] lg:pb-[6rem] lg:pt-[8rem]">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-y-[var(--space-12)] lg:grid-cols-12 lg:gap-x-[var(--space-8)]">
          <Reveal className="lg:col-span-6 lg:self-end">
            <SectionLabel number="05" label="Start" />
            <h2 id="closing-heading" className="type-display-l mt-[var(--space-6)] max-w-[12ch]">
              Try it with the demo account.
            </h2>
            <p className="mt-[var(--space-5)] max-w-[34ch] font-serif text-[1.125rem] leading-[1.6] text-[var(--fg-muted)]">
              One click, no sign-up. Or create an account for a library of your own.
            </p>
            <div className="mt-[var(--space-8)] flex flex-wrap items-start gap-[var(--space-3)]">
              <Link href="/signup" className="action action--primary">
                Create an account <span aria-hidden="true" className="action__arrow">→</span>
              </Link>
              <DemoButton label="Explore the demo account" size="large" />
            </div>

            {books.length > 0 && (
              <div className="mt-[var(--space-12)] max-w-[30rem]">
                <ul className="m-0 flex list-none items-end gap-[var(--space-4)] p-0">
                  {books.map(({ book, ratio }, i) => (
                    <li key={book.slug}>
                      <CoverPrint
                        slug={book.slug}
                        title={book.title}
                        authors={book.authors}
                        coverKey={book.coverKey}
                        width={i === 2 ? "clamp(4.25rem, 11vw, 6.5rem)" : "clamp(3.5rem, 9vw, 5.25rem)"}
                        ratio={ratio}
                        rotate={[-1.5, 1, -0.5, 2][i] ?? 0}
                        sizes="6.5rem"
                      />
                    </li>
                  ))}
                </ul>
                <div aria-hidden="true" className="mt-[2px] h-px bg-[var(--rule-strong)] opacity-60" />
              </div>
            )}
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-5 lg:col-start-8 lg:mr-[calc(var(--gutter)*-1)]">
            <figure className="m-0">
              <Photograph id="library-shelves" sizes="(min-width: 1024px) 40vw, 100vw" className="block aspect-[4/5] overflow-hidden" imgClassName="h-full w-full object-cover" />
              <figcaption className="type-caption mt-[var(--space-3)] text-[0.875rem] text-[var(--fg-subtle)]">
                {photo.caption}. Photograph by {photo.photographer}.
              </figcaption>
            </figure>
          </Reveal>
        </div>

        <div className="mt-[var(--space-16)] grid grid-cols-[minmax(0,1fr)] gap-y-[var(--space-8)] border-t border-[var(--fg)] pt-[var(--space-6)] lg:grid-cols-12 lg:gap-x-[var(--space-8)]">
          <div className="lg:col-span-4">
            <h3 className="type-label text-[var(--fg)]">About this project</h3>
            <div className="mt-[var(--space-4)] grid gap-[var(--space-4)] text-[0.875rem] leading-[1.6] text-[var(--fg-muted)] sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <p>An independent redesign and engineering case study. Not affiliated with Goodreads or Amazon.</p>
              <p>Catalogue and covers from Open Library (CC0). Search, accounts and libraries run on the project&rsquo;s own API.</p>
            </div>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <h3 className="type-label text-[var(--fg)]">Questions</h3>
            <div className="mt-[var(--space-3)]">
              {QUESTIONS.map(({ q, a }) => (
                <details key={q} className="faq group border-b border-[var(--rule)]">
                  <summary className="flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-[var(--space-4)] font-serif text-[1.1875rem] text-[var(--fg)] [&::-webkit-details-marker]:hidden">
                    {q}
                    <span aria-hidden="true" className="text-[1.25rem] text-[var(--fg-subtle)] transition-transform duration-[220ms] group-open:rotate-45">+</span>
                  </summary>
                  <p className="max-w-[60ch] pb-[var(--space-5)] text-[0.9375rem] leading-[1.65] text-[var(--fg-muted)]">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
