import type { CSSProperties } from "react";
import { STATUS_LABEL, type Book, type ReadingStatus } from "@/lib/api";
import { BookObject } from "../BookObject";
import { Reveal } from "../motion/Reveal";
import { SectionLabel } from "../SectionHeader";

/*
 * Where each example book stands: one large book in front, three receding behind it.
 * `from` is where it starts before the scene is revealed — gathered in a stack behind
 * the front book — so the arrangement fans out rather than simply fading in.
 */
const ARRANGEMENT: Record<string, { style: CSSProperties; width: string; turn: number; from: string }> = {
  "dune-ol893414w": { style: { left: "4%", bottom: "0", zIndex: 5 }, width: "clamp(9rem, 22vw, 15rem)", turn: 6, from: "translate(0, 0)" },
  "the-secret-history-ol4321141w": { style: { left: "33%", bottom: "24%", zIndex: 3 }, width: "clamp(6.5rem, 15vw, 10.5rem)", turn: -6, from: "translate(-60%, 12%)" },
  "klara-and-the-sun-ol20883297w": { style: { left: "55%", bottom: "40%", zIndex: 2 }, width: "clamp(5.5rem, 12vw, 8.75rem)", turn: -14, from: "translate(-120%, 30%)" },
  "project-hail-mary-ol21745884w": { style: { left: "74%", bottom: "55%", zIndex: 1 }, width: "clamp(5rem, 10vw, 7.5rem)", turn: -22, from: "translate(-190%, 60%)" },
};

const LEDGER: ReadingStatus[] = ["WANT_TO_READ", "CURRENTLY_READING", "READ", "DNF"];

/**
 * 03 — Your library: the books are the interface.
 *
 * No screenshot frame. Real catalogue books stand in depth, each carrying the status tag
 * the library gives it, beside a ledger of the counts. The whole scene is an example and
 * says so — it is not the visitor's library, and a new account starts empty. The back
 * books rise over the end of the forest section above.
 */
export function LibrarySection({ entries }: { entries: { book: Book; status: ReadingStatus }[] }) {
  const count = (status: ReadingStatus) => entries.filter((e) => e.status === status).length;

  return (
    <section data-surface="ivory" aria-labelledby="library-heading" className="relative z-20">
      <div className="page-frame grid grid-cols-[minmax(0,1fr)] gap-y-[var(--space-12)] pb-[var(--space-16)] lg:grid-cols-12 lg:gap-x-[var(--space-8)] lg:pb-[8rem]">
        {entries.length > 0 && (
          <Reveal className="library-scene relative -mt-[2rem] h-[26rem] sm:h-[32rem] lg:col-span-7 lg:-mt-[9rem] lg:h-[40rem]">
            <ul className="m-0 list-none p-0" aria-label="Example library">
              {entries.map(({ book, status }, i) => {
                const place = ARRANGEMENT[book.slug];
                if (!place) return null;
                return (
                  <li
                    key={book.slug}
                    className="lib-item book-stage absolute"
                    style={{ ...place.style, ["--from" as string]: place.from, ["--i" as string]: i }}
                  >
                    <BookObject
                      slug={book.slug}
                      title={book.title}
                      authors={book.authors}
                      coverKey={book.coverKey}
                      pageCount={book.pageCount}
                      width={place.width}
                      turn={place.turn}
                      sizes="15rem"
                    />
                    {/* The status, attached to the book it belongs to. */}
                    <span className={`status-tag ${status === "CURRENTLY_READING" ? "status-tag--active" : ""}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        )}

        <Reveal delay={0.1} className="lg:col-span-4 lg:col-start-9 lg:self-center lg:pt-[6rem]">
          <SectionLabel number="03" label="Your library" />
          <h2 id="library-heading" className="type-h1 mt-[var(--space-5)] max-w-[14ch] text-balance">
            Everything you save, in one place.
          </h2>
          <p className="mt-[var(--space-5)] max-w-[38ch] leading-[1.65] text-[var(--fg-muted)]">
            One tap saves a book. Move it between reading states as that changes; your library
            keeps them together, searchable, and visible only to you.
          </p>

          <dl className="mt-[var(--space-8)] max-w-[22rem] border-b border-[var(--rule)]">
            {LEDGER.map((status) => (
              <div key={status} className="flex items-baseline justify-between border-t border-[var(--rule)] py-[var(--space-3)]">
                <dt className="text-[0.9375rem] text-[var(--fg-muted)]">{STATUS_LABEL[status]}</dt>
                <dd className="m-0 font-serif text-[1.25rem] text-[var(--fg)] [font-variant-numeric:tabular-nums]">{count(status)}</dd>
              </div>
            ))}
          </dl>
          <p className="type-caption mt-[var(--space-4)] max-w-[34ch] text-[var(--fg-subtle)]">
            An example library, made from catalogue books — not your account. Yours starts empty.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
