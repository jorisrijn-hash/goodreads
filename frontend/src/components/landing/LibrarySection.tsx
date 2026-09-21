import { STATUS_LABEL, type Book, type ReadingStatus } from "@/lib/api";
import { BookCard } from "../BookCard";
import { Reveal } from "../motion/Reveal";
import { SectionHeader } from "../SectionHeader";

const TABS: (ReadingStatus | "ALL")[] = ["ALL", "WANT_TO_READ", "CURRENTLY_READING", "READ", "DNF"];

/**
 * 03 — Your library, on ivory.
 *
 * The library view, drawn with real catalogue books and captioned as an example: a new
 * account starts empty, and this does not pretend to be anyone's reading.
 */
export function LibrarySection({ entries }: { entries: { book: Book; status: ReadingStatus }[] }) {
  const count = (tab: ReadingStatus | "ALL") =>
    tab === "ALL" ? entries.length : entries.filter((e) => e.status === tab).length;

  return (
    <section data-surface="ivory" aria-labelledby="library-heading">
      <div className="page-frame grid grid-cols-[minmax(0,1fr)] gap-y-[var(--space-12)] py-[var(--space-16)] lg:grid-cols-12 lg:gap-x-[var(--space-8)] lg:py-[7.5rem]">
        <Reveal className="lg:order-2 lg:col-span-4 lg:col-start-9 lg:self-center">
          <SectionHeader number="03" label="Your library">
            <span id="library-heading">Everything you save, in one place.</span>
          </SectionHeader>
          <p className="mt-[var(--space-6)] max-w-[40ch] text-[1.0625rem] leading-[1.65] text-[var(--fg-muted)]">
            Save a book with one tap. Move it between Want to Read, Currently Reading, Read and
            Did Not Finish as that changes. Your library keeps them together, searchable, and
            visible only to you.
          </p>
        </Reveal>

        {entries.length > 0 && (
          <Reveal delay={0.1} className="lg:order-1 lg:col-span-7">
            <figure data-surface="paper" className="rounded-[var(--radius-card)] p-[var(--space-6)] sm:p-[var(--space-10)]">
              <div aria-hidden="true">
                <p className="type-h2">My Library</p>
                <div className="mt-[var(--space-6)] flex gap-[var(--space-5)] overflow-hidden border-b border-[var(--rule)] text-[0.875rem]">
                  {TABS.map((tab, i) => (
                    <span
                      key={tab}
                      className={`shrink-0 whitespace-nowrap border-b-2 pb-[var(--space-3)] ${i === 0 ? "border-[var(--ink)] text-[var(--ink)]" : "border-transparent text-[var(--ink-60)]"}`}
                    >
                      {tab === "ALL" ? "All" : STATUS_LABEL[tab]}
                      {count(tab) > 0 && <span className="ml-[var(--space-2)] text-[var(--ink-60)]">{count(tab)}</span>}
                    </span>
                  ))}
                </div>
              </div>
              <ul className="mt-[var(--space-8)] grid list-none grid-cols-2 gap-x-[var(--space-5)] gap-y-[var(--space-8)] p-0 sm:grid-cols-4">
                {entries.map(({ book, status }) => (
                  <li key={book.slug}>
                    <BookCard book={book} />
                    <p className="type-label mt-[var(--space-2)] text-[var(--ink-60)]">{STATUS_LABEL[status]}</p>
                  </li>
                ))}
              </ul>
              <figcaption className="mt-[var(--space-8)] border-t border-[var(--rule)] pt-[var(--space-4)] text-[0.8125rem] text-[var(--ink-60)]">
                An example library, made from catalogue books. Yours starts empty.
              </figcaption>
            </figure>
          </Reveal>
        )}
      </div>
    </section>
  );
}
