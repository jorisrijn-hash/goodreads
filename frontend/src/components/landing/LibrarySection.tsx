import Link from "next/link";
import type { LandingCover } from "@/content/landing-covers";
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
export function LibrarySection({ entries }: { entries: { book: BookDetail; status: ReadingStatus; ratio: number; hq?: LandingCover }[] }) {
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
    <section id="library" data-surface="paper" aria-labelledby="library-heading" className="chapter [--edge-h:88px] lg:min-h-[94svh]">
      <SectionEdge shape="swell" />
      {/* Daylight on the table. */}
      <div aria-hidden="true" className="daylight" style={{ ["--lx" as string]: "-10px", ["--ly" as string]: "5px", ["--ld" as string]: "24s" }} />
      <Leaf shadow width="30rem" rotate={24} className="left-[40%] top-[-1rem] hidden lg:block" style={{ ["--sx" as string]: "-14px", ["--sy" as string]: "9px", ["--sd" as string]: "22s", ["--so" as string]: "0.13" }} />

      <div className="page-frame relative grid grid-cols-[minmax(0,1fr)] items-center gap-y-[var(--space-10)] pb-[var(--space-16)] pt-[var(--space-16)] lg:min-h-[94svh] lg:grid-cols-[minmax(0,26fr)_minmax(0,51fr)_minmax(0,23fr)] lg:gap-x-[clamp(1.5rem,3vw,3.5rem)] lg:pb-[7rem] lg:pt-[5rem]">
        <Reveal>
          <SectionLabel number="03" label="Your library" />
          <h2 id="library-heading" className="mt-[var(--space-6)] font-serif text-[clamp(2.5rem,3.8vw,3.75rem)] font-[380] leading-[1.02] tracking-[-0.02em]">
            Keep it all
            <br />
            together.
          </h2>
          <p className="mt-[var(--space-5)] max-w-[28ch] text-[1rem] leading-[1.65] text-[var(--fg-muted)]">
            Save books, track where each one stands, and pick up right where you left off.
          </p>
          <Link href="/library" className="mt-[var(--space-8)] inline-flex min-h-[48px] items-center gap-[var(--space-3)] border border-[var(--rule-strong)] px-[var(--space-5)] text-[0.875rem] font-medium text-[var(--fg)] no-underline transition-colors duration-150 hover:bg-[var(--ivory)] [&:hover_.action__arrow]:translate-x-[4px]">
            See your library <span aria-hidden="true" className="action__arrow">→</span>
          </Link>
        </Reveal>

        {row.length > 0 && (
          <figure className="relative m-0">
            <p aria-hidden="true" className="hand absolute right-[2%] top-[-3.5rem] rotate-[-4deg] text-[1.5rem] text-[var(--ink-70)]">
              An example library <span className="inline-block rotate-[25deg]">↓</span>
            </p>
            <Reveal className="lib-row">
              <ul className="-mx-[var(--gutter)] m-0 flex list-none items-end gap-[clamp(0.5rem,1.4vw,1.25rem)] overflow-x-auto px-[var(--gutter)] pb-[var(--space-2)] pt-[var(--space-3)] [scrollbar-width:none] lg:mx-0 lg:justify-center lg:gap-0 lg:overflow-visible lg:px-0" aria-label="Example library">
                {row.map(({ book, status, ratio, hq }, i) => {
                  const current = status === "CURRENTLY_READING";
                  return (
                    <li
                      key={book.slug}
                      className="lib-book flex shrink-0 flex-col items-center lg:[margin-inline:-0.55rem]"
                      // The book being read settles last, from a little lower. The others
                      // stand at slightly different depths on the table.
                      style={{ ["--i" as string]: current ? row.length : i, ["--from" as string]: current ? "40px" : `${18 + (i % 2) * 10}px`, zIndex: current ? 5 : [1, 3, 5, 4, 2][i], ["--lift" as string]: `${[10, 22, 0, 16, 6][i] ?? 0}px` }}
                    >
                      <CoverPrint
                        slug={book.slug}
                        title={book.title}
                        authors={book.authors}
                        coverKey={book.coverKey}
                        width={current ? "clamp(6.5rem, 12.6vw, 12.75rem)" : "clamp(4.5rem, 9.2vw, 9.5rem)"}
                        ratio={ratio}
                        rotate={[-1, 1.2, 0, -0.8, 1][i] ?? 0}
                        sizes={current ? "12.75rem" : "9.5rem"}
                        hq={hq}
                      />
                      <span className={`status-pill mt-[var(--space-4)] ${current ? "status-pill--active" : ""}`}>{STATUS_LABEL[status]}</span>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
            <figcaption className="type-caption mt-[var(--space-8)] text-center text-[0.9375rem] text-[var(--fg-muted)]">
              Catalogue books with illustrative statuses. Your library starts empty.
            </figcaption>
          </figure>
        )}

        <Reveal delay={0.1}>
          <dl data-surface="ivory" className="m-0 border-y-2 border-[var(--ink)] px-[var(--space-5)] py-[var(--space-2)] shadow-[0_26px_50px_-34px_rgba(25,24,21,0.6)]">
            {LEDGER.map((status) => (
              <div key={status} className="flex items-baseline justify-between border-b border-[var(--rule-strong)]/50 py-[var(--space-4)] last:border-0">
                <dt className="type-label text-[0.75rem] text-[var(--ink)]">{STATUS_LABEL[status]}</dt>
                <dd className="m-0 font-serif text-[1.5rem] leading-none text-[var(--ink)] [font-variant-numeric:lining-nums_tabular-nums]">{count(status)}</dd>
              </div>
            ))}
          </dl>
          <p className="type-label mt-[var(--space-3)] text-[var(--fg-muted)]">Example counts, not your account</p>
        </Reveal>
      </div>

      {/* A photograph from the table dips into the next chapter. */}
      {/* It reaches up from the boundary toward the books behind the cluster. */}
      <div className="crossing drift bottom-[-4rem] left-[24%] hidden w-[17rem] rotate-[-5deg] lg:block" style={{ ["--drift" as string]: "12px" }}>
        <div className="print relative h-[14rem] w-full">
          <Photograph id="library-vault" sizes="17rem" className="block h-full" imgClassName="object-[50%_62%]" />
        </div>
      </div>
      <Leaf width="12rem" rotate={-50} className="crossing bottom-[2rem] left-[-3.5rem] hidden lg:block" breeze={{ x: 5, y: 2, r: 1.25, d: 19, delay: 5 }} />
    </section>
  );
}
