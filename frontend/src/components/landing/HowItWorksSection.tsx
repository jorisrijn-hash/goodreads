import { coverUrl, type BookDetail, type BookPage } from "@/lib/api";
import { SectionLabel } from "../SectionHeader";
import { StepSequence } from "./StepSequence";

/**
 * 04 How it works: one interface, changing state as you scroll.
 *
 * Only today's loop: discover, save, track status. The canvas is a single drawing of the
 * product in which the same parts move. Dune starts as a small cover in a corrected
 * search result, grows into the book, is saved to the library strip, and has its status
 * moved, without ever being swapped for another element. Everything in it is a drawing:
 * spans and images, no controls. Scrolling calls no API; the data was fetched once,
 * read-only, when the page was rendered.
 */
export function HowItWorksSection({
  dune,
  herbert,
  shelf,
}: {
  dune: BookDetail | null;
  herbert: BookPage | null;
  shelf: BookDetail[];
}) {
  const steps = [
    { number: "01", label: "Discover", title: "Find the book, whatever you type.", body: "Browse by genre, or search by title, author or ISBN. A misspelling still finds it, and the result says so.", meta: ["Title", "Author", "ISBN"] },
    { number: "02", label: "Save", title: "One tap, and it is yours.", body: "Save a book as Want to Read. There is no form in the way; reasons and notes can come later.", meta: ["Want to Read", "Library"] },
    { number: "03", label: "Track status", title: "Move it as your reading moves.", body: "Currently Reading, Read, Did Not Finish. The library keeps each book where it stands.", meta: ["4 states", "Private"] },
  ];

  const img = (coverKey: string | null | undefined, width: 160 | 320) =>
    coverKey ? (
      // eslint-disable-next-line @next/next/no-img-element -- stored cover derivative
      <img src={coverUrl(coverKey, width) ?? undefined} alt="" loading="lazy" decoding="async" />
    ) : null;

  const others = (herbert?.items ?? []).filter((b) => b.slug !== dune?.slug).slice(0, 2);

  const canvas = (
    <div data-surface="paper" className="demo">
      <div className="demo__part demo__tabs">
        {["Search", "Book", "Library"].map((t, i) => (
          <span key={t} className="demo__tab" data-tab={i}>{t}</span>
        ))}
      </div>

      <div className="demo__part demo__search">
        <div className="demo__field">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
          <span>frank herbrt</span>
          <span className="demo__caret" />
        </div>
        {herbert?.correctedFrom && (
          <p className="demo__note">Showing results for a close match to “{herbert.correctedFrom}”</p>
        )}
      </div>

      <div className="demo__part demo__results">
        {/* Dune's row is only its highlight: the cover and title drawn over it are the
            persistent ones, which is what lets them travel into the next states. */}
        <div className="demo__row demo__row--first" />
        {others.map((b) => (
          <div key={b.slug} className="demo__row" style={{ paddingLeft: 0 }}>
            {img(b.coverKey, 160)}
            <span><b>{b.title}</b>{b.authors[0]}{b.publishedYear ? `, ${b.publishedYear}` : ""}</span>
          </div>
        ))}
      </div>

      {/* The persistent parts: Dune's cover and its title. */}
      <div className="demo__part demo__cover">{img(dune?.coverKey, 320)}</div>
      <div className="demo__part demo__title">
        <strong>{dune?.title ?? "Dune"}</strong>
        <span>{dune?.authors[0]}</span>
        <div className="demo__meta">
          <span>First published<em>{dune?.publishedYear ?? ""}</em></span>
          <span>Length<em>{dune?.pageCount ? `${dune.pageCount} pages` : ""}</em></span>
          <span>ISBN<em>{dune?.isbn13 ?? ""}</em></span>
        </div>
      </div>

      <div className="demo__part demo__save">
        <span className="demo__save-idle">Want to Read</span>
        <span className="demo__save-done">✓ Want to Read</span>
      </div>

      <div className="demo__part demo__status">
        <p className="demo__status-label">Reading status</p>
        <div className="demo__segments">
          <i />
          {["Want to Read", "Currently Reading", "Read", "Did Not Finish"].map((s) => <span key={s}>{s}</span>)}
        </div>
        <p className="demo__status-line">In your library as Currently Reading</p>
      </div>

      <div className="demo__part demo__library">
        <p className="demo__status-label">My Library</p>
        <div className="demo__library-row">
          {shelf.map((b) => <span key={b.slug}>{img(b.coverKey, 160)}</span>)}
          <span className="demo__slot">
            {img(dune?.coverKey, 160)}
            <span className="demo__slot-tag"><span className="when-1">Want to Read</span><span className="when-2">Currently Reading</span></span>
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <section data-surface="burgundy" aria-labelledby="how-heading" className="relative">
      <div className="page-frame pb-[var(--space-16)] pt-[var(--space-16)] lg:pb-[6rem] lg:pt-[7rem]">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-[var(--space-10)]">
          <div className="lg:col-span-5 lg:col-start-8 lg:pl-[var(--space-10)]">
            <SectionLabel number="04" label="How it works" />
            <h2 id="how-heading" className="type-h2 mt-[var(--space-5)] max-w-[18ch]">
              Three steps, all of them working today.
            </h2>
          </div>
        </div>

        <StepSequence
          canvas={canvas}
          steps={steps.map((step) => (
            <div key={step.number}>
              <span aria-hidden="true" className="block font-serif text-[clamp(3.5rem,6vw,5.5rem)] font-[330] leading-none tracking-[-0.04em] text-[var(--fg-muted)]">
                {step.number}
              </span>
              <p className="type-label mt-[var(--space-5)] text-[var(--fg-subtle)]">{step.label}</p>
              <h3 className="type-h2 mt-[var(--space-2)] max-w-[16ch]">{step.title}</h3>
              <p className="mt-[var(--space-3)] max-w-[36ch] font-serif text-[1.0625rem] leading-[1.6] text-[var(--fg-muted)]">{step.body}</p>
              <p className="type-label mt-[var(--space-5)] flex flex-wrap gap-x-[var(--space-4)] border-t border-[var(--rule)] pt-[var(--space-3)] text-[var(--fg-subtle)]">
                {step.meta.map((m) => <span key={m}>{m}</span>)}
              </p>
            </div>
          ))}
        />
      </div>
    </section>
  );
}
