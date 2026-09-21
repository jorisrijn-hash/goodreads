import { coverUrl, type BookDetail, type BookPage } from "@/lib/api";
import { SectionLabel } from "../SectionHeader";
import { StepSequence } from "./StepSequence";

/**
 * 04 — How it works, demonstrated rather than described.
 *
 * Only today's loop: discover, save, track status. As the reader scrolls past each step,
 * a pinned scene shows it happening to a real book — Dune — drawn in the product's own
 * UI language. The scenes are illustrations: spans, not controls. Nothing here calls the
 * API when you scroll; the only data is fetched once, read-only, when the page renders.
 */
export function HowItWorksSection({
  dune,
  herbert,
  shelf,
}: {
  dune: BookDetail | null;
  /** The real response to a misspelled author search. */
  herbert: BookPage | null;
  /** Two other catalogue books to stand beside it in the library strip. */
  shelf: BookDetail[];
}) {
  const steps = [
    { number: "01", title: "Discover", body: "Browse by genre, or search by title, author or ISBN. A misspelling still finds the book." },
    { number: "02", title: "Save", body: "One tap adds it to your library as Want to Read. No form in the way." },
    { number: "03", title: "Track status", body: "Move it to Currently Reading, Read or Did Not Finish as that changes." },
  ];

  const cover = (book: { coverKey: string | null } | null, className: string) =>
    book?.coverKey ? (
      // eslint-disable-next-line @next/next/no-img-element -- stored cover derivative
      <img src={coverUrl(book.coverKey, 160) ?? undefined} alt="" loading="lazy" decoding="async" className={className} />
    ) : (
      <span className={`${className} block bg-[var(--paper)]`} />
    );

  const scenes = [
    // 01 — a misspelled search, corrected to the real results.
    <div key="discover" className="scene-card">
      <div className="scene-field">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
        <span>frank herbrt</span>
        <span className="scene-caret" />
      </div>
      {herbert?.correctedFrom && (
        <p className="mt-[var(--space-4)] text-[0.8125rem] text-[var(--ink-60)]">Showing results for a close match to “{herbert.correctedFrom}”</p>
      )}
      <div className="mt-[var(--space-4)] grid gap-[var(--space-3)]">
        {(herbert?.items ?? []).slice(0, 3).map((book, i) => (
          <div key={book.slug} className="scene-row" style={{ ["--i" as string]: i }} data-first={i === 0 ? "" : undefined}>
            {cover(book, "h-[64px] w-[42px] rounded-[2px] object-cover shadow-sm")}
            <span>
              <span className="block font-serif text-[1rem] text-[var(--ink)]">{book.title}</span>
              <span className="block text-[0.8125rem] text-[var(--ink-60)]">{book.authors[0]}{book.publishedYear ? ` · ${book.publishedYear}` : ""}</span>
            </span>
          </div>
        ))}
      </div>
    </div>,

    // 02 — saved: the button settles into its saved state, the book slides onto the shelf.
    <div key="save" className="scene-card">
      <div className="flex gap-[var(--space-5)]">
        {cover(dune, "h-[132px] w-[86px] rounded-[2px] object-cover shadow-md")}
        <div>
          <p className="font-serif text-[1.5rem] leading-tight text-[var(--ink)]">{dune?.title ?? "Dune"}</p>
          <p className="text-[0.875rem] text-[var(--ink-60)]">{dune?.authors[0]}</p>
          <span className="scene-save mt-[var(--space-4)]">
            <span className="scene-save__idle">Want to Read</span>
            <span className="scene-save__done">✓ Want to Read</span>
          </span>
          <p className="scene-note mt-[var(--space-2)] text-[0.8125rem] text-[var(--ink-60)]">In your library as Want to Read</p>
        </div>
      </div>
      <div className="mt-[var(--space-6)] border-t border-[var(--rule)] pt-[var(--space-4)]">
        <p className="type-label text-[var(--ink-60)]">My Library</p>
        <div className="mt-[var(--space-3)] flex items-end gap-[var(--space-3)]">
          {shelf.map((book) => <span key={book.slug}>{cover(book, "h-[78px] w-[52px] rounded-[2px] object-cover opacity-80")}</span>)}
          <span className="scene-arrive">{cover(dune, "h-[78px] w-[52px] rounded-[2px] object-cover shadow-md")}</span>
        </div>
      </div>
    </div>,

    // 03 — the status control moves from Want to Read to Currently Reading.
    <div key="track" className="scene-card">
      <div className="flex items-center gap-[var(--space-4)]">
        {cover(dune, "h-[72px] w-[48px] rounded-[2px] object-cover shadow-sm")}
        <div>
          <p className="font-serif text-[1.25rem] leading-tight text-[var(--ink)]">{dune?.title ?? "Dune"}</p>
          <p className="text-[0.8125rem] text-[var(--ink-60)]">{dune?.authors[0]}</p>
        </div>
      </div>
      <div className="scene-segments mt-[var(--space-6)]">
        <span className="scene-segments__thumb" />
        {["Want to Read", "Currently Reading", "Read", "Did Not Finish"].map((s, i) => (
          <span key={s} className="scene-segments__item" data-index={i}>{s}</span>
        ))}
      </div>
      <p className="scene-status mt-[var(--space-4)] text-[0.875rem] text-[var(--ink-60)]">
        In your library as <span className="text-[var(--ink)]">Currently Reading</span>
      </p>
    </div>,
  ];

  return (
    <section data-surface="burgundy" aria-labelledby="how-heading" className="relative">
      <div className="page-frame py-[var(--space-16)] lg:py-[8rem]">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-[var(--space-8)]">
          <div className="lg:col-span-5 lg:col-start-8">
            <SectionLabel number="04" label="How it works" />
            <h2 id="how-heading" className="type-h2 mt-[var(--space-5)] max-w-[20ch]">
              Three steps, all of them working today.
            </h2>
          </div>
        </div>

        <StepSequence
          scenes={scenes}
          steps={steps.map((step) => (
            <div key={step.number}>
              <span aria-hidden="true" className="step__number block font-serif text-[clamp(4.5rem,9vw,8rem)] font-[330] leading-[0.9] tracking-[-0.04em]">
                {step.number}
              </span>
              <h3 className="type-h2 mt-[var(--space-4)]">{step.title}</h3>
              <p className="mt-[var(--space-3)] max-w-[36ch] text-[1.0625rem] leading-[1.6] text-[var(--fg-muted)]">{step.body}</p>
            </div>
          ))}
        />
      </div>
    </section>
  );
}
