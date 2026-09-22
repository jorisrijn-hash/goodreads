import Link from "next/link";
import { SAVE_REASON_LABEL, coverUrl, type BookDetail, type BookPage } from "@/lib/api";
import { SectionLabel } from "../SectionHeader";
import { Photograph } from "../Photograph";
import { SectionEdge } from "./SectionEdge";
import { StepSequence } from "./StepSequence";

const STEPS = [
  { number: "01", title: "Discover", body: "Find books by title, author or genre. A misspelling still finds the right book." },
  { number: "02", title: "Save", body: "Add books to your library with one tap. No forms in the way." },
  { number: "03", title: "Track", body: "Move books between reading states as you go." },
];

/**
 * 04 How it works: the product, on a phone, changing as you scroll.
 *
 * Only today's loop. The phone shows a drawing of the real interface in which Dune is
 * one persistent element: a corrected search result, then the book being saved into the
 * library, then its status moving to Currently Reading. Spans and images only, no
 * controls; scrolling makes no request.
 */
export function HowItWorksSection({ dune, herbert, shelf }: { dune: BookDetail | null; herbert: BookPage | null; shelf: BookDetail[] }) {
  const img = (coverKey: string | null | undefined, width: 160 | 320) =>
    // eslint-disable-next-line @next/next/no-img-element -- stored cover derivative
    coverKey ? <img src={coverUrl(coverKey, width) ?? undefined} alt="" loading="lazy" decoding="async" /> : null;
  const others = (herbert?.items ?? []).filter((b) => b.slug !== dune?.slug).slice(0, 4);

  // `state` is set only on the inline phones; the pinned phone takes its state from the
  // stage around it, which the scroll position drives.
  const phone = (state: number | undefined, width: string) => (
    <div className="phone" style={{ ["--phone-w" as string]: width }}>
      <div className="phone__screen">
        <span className="phone__island" />
        <div className="demo" data-state={state}>
          <div className="demo__part demo__status-bar"><span>9:41</span><span>●●●</span></div>
          <div className="demo__part demo__tabs">
            {["Search", "Book", "Library"].map((t, i) => <span key={t} className="demo__tab" data-tab={i}>{t}</span>)}
          </div>
          <div className="demo__part demo__search">
            <div className="demo__field">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
              <span>frank herbrt</span><span className="demo__caret" />
            </div>
            {herbert?.correctedFrom && (
              <p className="demo__note"><b>{herbert.total} books</b> · close match to &ldquo;{herbert.correctedFrom}&rdquo;</p>
            )}
          </div>
          <div className="demo__part demo__results">
            <div className="demo__row demo__row--first" />
            {others.map((b) => (
              <div key={b.slug} className="demo__row">{img(b.coverKey, 160)}<span><b>{b.title}</b>{b.authors[0]}{b.publishedYear ? `, ${b.publishedYear}` : ""}</span></div>
            ))}
          </div>
          {/* Dune grows to about 200px here, so it takes the full-resolution scan. */}
          <div className="demo__part demo__cover">
            {/* eslint-disable-next-line @next/next/no-img-element -- prepared landing cover */}
            <img src="/covers-hq/dune-ol893414w-560.webp" srcSet="/covers-hq/dune-ol893414w-320.webp 320w, /covers-hq/dune-ol893414w-560.webp 560w" sizes="12rem" alt="" loading="lazy" decoding="async" />
          </div>
          <div className="demo__part demo__title">
            <strong>{dune?.title ?? "Dune"}</strong>
            <span>{dune?.authors[0]}</span>
            <div className="demo__meta">
              <span>Published<em>{dune?.publishedYear}</em></span>
              <span>Length<em>{dune?.pageCount} pages</em></span>
              <span className="demo__genres">{(dune?.genres ?? []).slice(0, 2).map((g) => <i key={g.slug}>{g.name}</i>)}</span>
            </div>
          </div>
          <div className="demo__part demo__save"><span className="demo__save-idle">Want to Read</span><span className="demo__save-done">✓ Saved as Want to Read</span></div>
          {/* The question the book page asks straight after a save, with its real options. */}
          <div className="demo__part demo__reason">
            <p className="demo__reason-q">Why did you save this?</p>
            <div className="demo__reason-chips">
              {Object.values(SAVE_REASON_LABEL).map((label) => <span key={label}>{label}</span>)}
            </div>
          </div>
          <div className="demo__part demo__status">
            <p className="demo__label">Reading status</p>
            <div className="demo__segments"><i />{["Want to Read", "Currently Reading", "Read", "Did Not Finish"].map((s) => <span key={s}>{s}</span>)}</div>
            <p className="demo__status-line">In your library as <b>Currently Reading</b></p>
          </div>
          <div className="demo__part demo__library">
            <p className="demo__label">My Library</p>
            <div className="demo__library-row">
              {shelf.map((b) => <span key={b.slug}>{img(b.coverKey, 160)}</span>)}
              <span className="demo__slot">
                {/* eslint-disable-next-line @next/next/no-img-element -- prepared landing cover */}
                <img src="/covers-hq/dune-ol893414w-320.webp" alt="" loading="lazy" decoding="async" /><span className="demo__slot-tag"><span className="when-1">Want to Read</span><span className="when-2">Currently Reading</span></span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const stepText = (step: (typeof STEPS)[number]) => (
    <>
      <span className="block font-serif text-[2.25rem] font-[360] leading-none text-[var(--fg-muted)]">{step.number}</span>
      <h3 className="mt-[var(--space-2)] font-serif text-[1.5rem] font-[400] leading-tight underline decoration-[var(--rule-strong)] decoration-1 underline-offset-[6px]">{step.title}</h3>
      <p className="mt-[var(--space-3)] max-w-[30ch] text-[0.875rem] leading-[1.6] text-[var(--fg-muted)]">{step.body}</p>
    </>
  );

  return (
    <section id="how" data-surface="burgundy" aria-labelledby="how-heading" className="chapter how [--edge-h:88px]">
      <SectionEdge shape="tilt" />
      {/* Desktop: the pinned stage. */}
      <StepSequence className="sticky top-0 hidden h-[var(--pin)] overflow-hidden lg:block">
              <div className="page-frame grid h-full grid-cols-12 items-center gap-x-[var(--space-8)]">
                <div className="col-span-3">
                  <SectionLabel number="04" label="How it works" />
                  <h2 id="how-heading" className="mt-[var(--space-6)] font-serif text-[clamp(2.25rem,3.2vw,3.25rem)] font-[380] leading-[1.05] tracking-[-0.02em]">
                    Three steps to a more meaningful reading life.
                  </h2>
                  <Link href="/discover" className="link-rule mt-[var(--space-8)] inline-flex items-center gap-[var(--space-2)] text-[0.9375rem] text-[var(--fg)]">
                    See it in action <span aria-hidden="true">→</span>
                  </Link>
                </div>

                <div className="relative col-span-5 flex h-full items-center justify-center" aria-hidden="true">
                  <div className="print absolute right-[2%] top-[18%] h-[15rem] w-[11rem] rotate-[6deg] opacity-90">
                    <Photograph id="library-vault" sizes="11rem" className="block h-full" imgClassName="object-[50%_20%]" />
                  </div>
                  {/* A sheet of paper under the phone, so it rests on something. */}
                  <div className="paper-fragment absolute left-[4%] top-[26%] h-[52%] w-[44%] rotate-[-9deg] opacity-95" />
                  <div className="relative rotate-[-4deg]">{phone(undefined, "min(23.5rem, 48vh)")}</div>
                  <p className="hand absolute bottom-[5%] right-[-2%] rotate-[-6deg] text-[1.375rem] text-[#d4c7bf]">Real product UI</p>
                </div>

                <ol className="relative col-span-4 m-0 list-none p-0 pl-[var(--space-8)]">
                  <span aria-hidden="true" className="steps-rail" />
                  {STEPS.map((step, i) => (
                    <li key={step.number} data-step={i} className="step relative border-b border-[var(--rule)] py-[var(--space-6)] last:border-0">
                      <span aria-hidden="true" className="step__dot top-[calc(var(--space-6)+0.9rem)] -translate-x-[var(--space-8)]" />
                      {stepText(step)}
                    </li>
                  ))}
                </ol>
              </div>
      </StepSequence>

      {/* Phones and tablets: each step with its own phone. */}
            <div className="page-frame pb-[var(--space-16)] pt-[var(--space-16)] lg:hidden">
              <SectionLabel number="04" label="How it works" />
              <h2 className="mt-[var(--space-5)] font-serif text-[2.25rem] font-[380] leading-[1.05]">Three steps to a more meaningful reading life.</h2>
              <ol className="m-0 mt-[var(--space-10)] list-none space-y-[var(--space-12)] p-0">
                {STEPS.map((step, i) => (
                  <li key={step.number} className="step">
                    {stepText(step)}
                    <div className="mt-[var(--space-6)] flex justify-center" aria-hidden="true">{phone(i, "min(17rem, 78vw)")}</div>
                  </li>
                ))}
              </ol>
            </div>
    </section>
  );
}
