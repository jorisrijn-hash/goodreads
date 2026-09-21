import { STATUS_LABEL, type BookDetail, type ReadingStatus } from "@/lib/api";
import { CoverPrint } from "../CoverPrint";
import { Reveal } from "../motion/Reveal";
import { SectionLabel } from "../SectionHeader";

/*
 * The cluster, as positions in its box: Dune large in front, the others close around and
 * behind it. The Song of Achilles stands highest and rises over the end of the forest
 * section above.
 */
const PLACE: Record<string, { left: string; top: string; width: string; rotate: number; z: number; tagRight?: boolean }> = {
  "dune-ol893414w": { left: "6%", top: "30%", width: "clamp(9.5rem, 23vw, 16.5rem)", rotate: -1, z: 5 },
  // Dune covers this one's left edge, so its tag hangs on the right.
  "the-secret-history-ol4321141w": { left: "37%", top: "15%", width: "clamp(7.5rem, 16vw, 12rem)", rotate: 1.5, z: 4, tagRight: true },
  "crying-in-h-mart-ol22448002w": { left: "60%", top: "34%", width: "clamp(6.5rem, 14vw, 10.5rem)", rotate: -2, z: 3 },
  "the-song-of-achilles-ol16509148w": { left: "66%", top: "0%", width: "clamp(5.5rem, 11vw, 8.5rem)", rotate: 2, z: 2 },
  "the-bell-jar-ol1865528w": { left: "40%", top: "60%", width: "clamp(5.5rem, 11vw, 8.5rem)", rotate: 2.5, z: 6 },
};

const LEDGER: ReadingStatus[] = ["WANT_TO_READ", "CURRENTLY_READING", "READ", "DNF"];

/**
 * 03 Your library: the books are the interface.
 *
 * Five real books, one in each reading state and a second saved for later, lie on a
 * paper block with their status pinned to them. Beside them, the words are short and
 * the counts are set as a ledger. The whole scene is an example and says so: it is not
 * the visitor's library, and a new account starts empty.
 */
export function LibrarySection({ entries }: { entries: { book: BookDetail; status: ReadingStatus; ratio: number }[] }) {
  const count = (status: ReadingStatus) => entries.filter((e) => e.status === status).length;

  return (
    <section data-surface="ivory" aria-labelledby="library-heading" className="relative z-20">
      <div className="page-frame grid grid-cols-[minmax(0,1fr)] gap-y-[var(--space-10)] pb-[var(--space-16)] lg:grid-cols-12 lg:gap-x-[var(--space-8)] lg:pb-[7rem]">
        {entries.length > 0 && (
          <figure className="m-0 lg:col-span-7">
            <Reveal className="library-cluster relative -mt-[1.5rem] h-[25rem] sm:h-[34rem] lg:-mt-[7rem] lg:h-[44rem]">
              {/* Paper under part of the arrangement: a surface for the books to lie on. */}
              <div aria-hidden="true" data-surface="paper" className="absolute bottom-[4%] left-0 right-[8%] top-[22%] rounded-[2px]" />
              <ul className="m-0 list-none p-0" aria-label="Example library">
                {entries.map(({ book, status, ratio }, i) => {
                  const place = PLACE[book.slug];
                  if (!place) return null;
                  return (
                    <li key={book.slug} className="collage-item absolute" style={{ left: place.left, top: place.top, zIndex: place.z, ["--i" as string]: i }}>
                      <CoverPrint
                        slug={book.slug}
                        title={book.title}
                        authors={book.authors}
                        coverKey={book.coverKey}
                        width={place.width}
                        ratio={ratio}
                        rotate={place.rotate}
                        sizes="16.5rem"
                      />
                      <span className={`status-tag ${status === "CURRENTLY_READING" ? "status-tag--active" : ""} ${place.tagRight ? "status-tag--right" : ""}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
            <figcaption className="type-caption mt-[var(--space-4)] text-[var(--fg-subtle)]">
              An example library: five catalogue books with illustrative statuses. Yours starts empty.
            </figcaption>
          </figure>
        )}

        <Reveal delay={0.08} className="lg:col-span-4 lg:col-start-9 lg:self-center">
          <SectionLabel number="03" label="Your library" />
          <h2 id="library-heading" className="type-h1 mt-[var(--space-5)] max-w-[12ch]">
            Everything you save, in one place.
          </h2>
          <p className="mt-[var(--space-5)] max-w-[34ch] font-serif text-[1.0625rem] leading-[1.6] text-[var(--fg-muted)]">
            One tap saves a book. Move it between reading states as that changes. Your
            library keeps them together, searchable, and visible only to you.
          </p>

          <dl className="mt-[var(--space-8)] border-t-2 border-[var(--fg)]">
            {LEDGER.map((status) => (
              <div key={status} className="flex items-baseline justify-between border-b border-[var(--rule-strong)]/60 py-[10px]">
                <dt className="type-label text-[var(--fg)]">{STATUS_LABEL[status]}</dt>
                <dd className="m-0 text-[0.9375rem] font-medium [font-variant-numeric:tabular-nums]">{count(status)}</dd>
              </div>
            ))}
          </dl>
          <p className="type-label mt-[var(--space-3)] text-[var(--fg-subtle)]">Four states · Searchable · Private to you</p>
        </Reveal>
      </div>
    </section>
  );
}
