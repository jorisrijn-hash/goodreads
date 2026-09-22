import Link from "next/link";
import { STATUS_LABEL, type BookDetail, type ReadingStatus } from "@/lib/api";
import { CoverPrint } from "../CoverPrint";
import { Reveal } from "../motion/Reveal";
import { Photograph } from "../Photograph";
import { SectionLabel } from "../SectionHeader";
import { Leaf } from "./Leaf";
import { SectionEdge } from "./SectionEdge";

const LEDGER: ReadingStatus[] = ["WANT_TO_READ", "CURRENTLY_READING", "READ", "DNF"];

/**
 * 03 Your library, on a reading table.
 *
 * A row of real books standing on the paper, each with the status the library gives it.
 * The book being read stands tallest and settles last. Beside them, a small ledger of the
 * counts. All of it is an example and says so: not the visitor's library.
 */
export function LibrarySection({ entries }: { entries: { book: BookDetail; status: ReadingStatus; ratio: number }[] }) {
  const count = (status: ReadingStatus) => entries.filter((e) => e.status === status).length;
  // Left to right as they stand; the book being read in the middle, largest.
  const order = ["WANT_TO_READ", "DNF", "CURRENTLY_READING", "READ", "WANT_TO_READ"] as const;
  const used = new Set<string>();
  const row = order.flatMap((status) => {
    const e = entries.find((x) => x.status === status && !used.has(x.book.slug));
    if (!e) return [];
    used.add(e.book.slug);
    return [e];
  });

  return (
    <section id="library" data-surface="paper" aria-labelledby="library-heading" className="chapter [--edge-h:88px] lg:min-h-[86svh]">
      <SectionEdge shape="swell" fill="var(--paper)" />
      {/* Daylight on the table. */}
      <Leaf shadow width="22rem" rotate={24} className="left-[46%] top-[2rem] hidden lg:block" style={{ ["--sx" as string]: "-12px", ["--sy" as string]: "8px", ["--sd" as string]: "24s" }} />

      <div className="page-frame relative grid grid-cols-[minmax(0,1fr)] items-center gap-y-[var(--space-10)] pb-[var(--space-16)] pt-[var(--space-16)] lg:min-h-[86svh] lg:grid-cols-12 lg:gap-x-[var(--space-8)] lg:pb-[8rem] lg:pt-[5rem]">
        <Reveal className="lg:col-span-3">
          <SectionLabel number="03" label="Your library" />
          <h2 id="library-heading" className="mt-[var(--space-6)] font-serif text-[clamp(2.25rem,3.4vw,3.25rem)] font-[380] leading-[1.02] tracking-[-0.02em]">
            Keep it all
            <br />
            together.
          </h2>
          <p className="mt-[var(--space-5)] max-w-[26ch] text-[0.9375rem] leading-[1.65] text-[var(--fg-muted)]">
            Save books, track where each one stands, and pick up right where you left off.
          </p>
          <Link href="/library" className="mt-[var(--space-8)] inline-flex min-h-[48px] items-center gap-[var(--space-3)] border border-[var(--rule-strong)] px-[var(--space-5)] text-[0.875rem] font-medium text-[var(--fg)] no-underline transition-colors duration-150 hover:bg-[var(--ivory)] [&:hover_.action__arrow]:translate-x-[4px]">
            See your library <span aria-hidden="true" className="action__arrow">→</span>
          </Link>
        </Reveal>

        {row.length > 0 && (
          <figure className="relative m-0 lg:col-span-6">
            <p aria-hidden="true" className="hand absolute right-[2%] top-[-3.25rem] rotate-[-4deg] text-[1.625rem] text-[var(--ink-70)]">
              An example library <span className="inline-block rotate-[25deg]">↓</span>
            </p>
            <Reveal className="lib-row">
              <ul className="-mx-[var(--gutter)] m-0 flex list-none items-end gap-[clamp(0.5rem,1.4vw,1.25rem)] overflow-x-auto px-[var(--gutter)] pb-[var(--space-2)] pt-[var(--space-3)] [scrollbar-width:none] lg:mx-0 lg:justify-center lg:overflow-visible lg:px-0" aria-label="Example library">
                {row.map(({ book, status, ratio }, i) => {
                  const current = status === "CURRENTLY_READING";
                  return (
                    <li
                      key={book.slug}
                      className="lib-book flex shrink-0 flex-col items-center"
                      // The book being read settles last, from a little lower.
                      style={{ ["--i" as string]: current ? row.length : i, ["--from" as string]: current ? "40px" : `${18 + (i % 2) * 10}px` }}
                    >
                      <CoverPrint
                        slug={book.slug}
                        title={book.title}
                        authors={book.authors}
                        coverKey={book.coverKey}
                        width={current ? "clamp(6rem, 10vw, 10rem)" : "clamp(4.25rem, 7.2vw, 7.75rem)"}
                        ratio={ratio}
                        rotate={[-1, 1.2, 0, -0.8, 1][i] ?? 0}
                        sizes="11rem"
                      />
                      <span className={`status-pill mt-[var(--space-4)] ${current ? "status-pill--active" : ""}`}>{STATUS_LABEL[status]}</span>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
            <figcaption className="type-caption mt-[var(--space-6)] text-center text-[0.875rem] text-[var(--fg-subtle)]">
              Catalogue books with illustrative statuses. Your library starts empty.
            </figcaption>
          </figure>
        )}

        <Reveal delay={0.1} className="lg:col-span-3">
          <dl data-surface="ivory" className="m-0 border border-[var(--rule)] px-[var(--space-5)] py-[var(--space-2)] shadow-[0_20px_40px_-30px_rgba(25,24,21,0.5)]">
            {LEDGER.map((status) => (
              <div key={status} className="flex items-baseline justify-between border-b border-[var(--rule)] py-[var(--space-3)] last:border-0">
                <dt className="text-[0.8125rem] text-[var(--fg-muted)]">{STATUS_LABEL[status]}</dt>
                <dd className="m-0 text-[0.875rem] font-medium [font-variant-numeric:tabular-nums]">{count(status)}</dd>
              </div>
            ))}
          </dl>
          <p className="type-label mt-[var(--space-3)] text-[var(--fg-subtle)]">Example counts</p>
        </Reveal>
      </div>

      {/* A photograph from the table dips into the next chapter. */}
      <div className="crossing drift bottom-[-4rem] left-[4%] hidden w-[15rem] rotate-[-5deg] lg:block" style={{ ["--drift" as string]: "12px" }}>
        <div className="print relative h-[11rem] w-full">
          <Photograph id="library-vault" sizes="15rem" className="block h-full" imgClassName="object-[50%_62%]" />
        </div>
      </div>
      <Leaf width="12rem" rotate={-50} className="crossing bottom-[2rem] left-[-3.5rem] hidden lg:block" breeze={{ x: 2, y: 1, r: 1, d: 19, delay: 5 }} />
    </section>
  );
}
