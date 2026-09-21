import { photograph } from "@/content/photography";
import { Reveal } from "../motion/Reveal";
import { Photograph } from "../Photograph";
import { SectionHeader } from "../SectionHeader";

/**
 * 04 — How it works, on burgundy.
 *
 * Only the loop that exists today: discover, save, track status. Reading progress and
 * the journal join this list when they are built, not before. Each step carries a small
 * drawing of the real control it describes.
 */
const STEPS = [
  {
    number: "01",
    title: "Discover",
    body: "Browse by genre, or search by title, author or ISBN.",
    scene: (
      <span className="flex min-h-[40px] items-center justify-between rounded-[var(--radius-input)] border border-[var(--rule-strong)] px-[var(--space-3)] text-[0.875rem]">
        <span>frank herbrt</span>
        <span className="text-[var(--fg-subtle)]">→ Dune</span>
      </span>
    ),
  },
  {
    number: "02",
    title: "Save",
    body: "One tap adds a book to your library as Want to Read.",
    scene: (
      <span className="flex flex-wrap items-center gap-[var(--space-3)] text-[0.875rem]">
        <span className="inline-flex min-h-[40px] items-center rounded-[var(--radius-input)] bg-[var(--ivory)] px-[var(--space-4)] font-medium text-[var(--burgundy)]">
          Want to Read
        </span>
        <span className="text-[var(--fg-subtle)]">In your library as Want to Read</span>
      </span>
    ),
  },
  {
    number: "03",
    title: "Track status",
    body: "Move it to Currently Reading, Read or Did Not Finish whenever that changes.",
    scene: (
      <span className="flex flex-wrap gap-x-[var(--space-4)] gap-y-[var(--space-2)] text-[0.875rem]">
        {["Want to Read", "Currently Reading", "Read", "Did Not Finish"].map((s) => (
          <span key={s} className={s === "Currently Reading" ? "text-[var(--fg)] underline decoration-[var(--fg)] underline-offset-[6px]" : "text-[var(--fg-subtle)]"}>
            {s}
          </span>
        ))}
      </span>
    ),
  },
];

export function HowItWorksSection() {
  const photo = photograph("old-library");
  return (
    <section data-surface="burgundy" aria-labelledby="how-heading">
      <div className="page-frame grid grid-cols-[minmax(0,1fr)] gap-y-[var(--space-12)] py-[var(--space-16)] lg:grid-cols-12 lg:gap-x-[var(--space-8)] lg:py-[7.5rem]">
        <Reveal as="div" className="lg:col-span-5">
          <figure className="m-0">
            <Photograph
              id="old-library"
              sizes="(min-width: 1024px) 38vw, 100vw"
              className="block aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] lg:aspect-[3/4]"
              imgClassName="h-full w-full object-cover"
            />
            <figcaption className="type-caption mt-[var(--space-4)] text-[var(--fg-muted)]">
              {photo.caption}. Photograph: {photo.photographer}.
            </figcaption>
          </figure>
        </Reveal>

        <div className="lg:col-span-6 lg:col-start-7 lg:self-center">
          <Reveal>
            <SectionHeader number="04" label="How it works">
              <span id="how-heading">Three steps, all of them working today.</span>
            </SectionHeader>
          </Reveal>
          <ol className="mt-[var(--space-10)] list-none p-0">
            {STEPS.map((step, i) => (
              <Reveal as="li" key={step.number} delay={0.06 * i} className="grid grid-cols-[4.5rem_1fr] gap-x-[var(--space-5)] border-t border-[var(--rule)] py-[var(--space-8)] sm:grid-cols-[6rem_1fr]">
                <span aria-hidden="true" className="font-serif text-[clamp(2.5rem,4vw,3.5rem)] font-[360] leading-none text-[var(--fg-muted)]">
                  {step.number}
                </span>
                <div>
                  <h3 className="type-h3">{step.title}</h3>
                  <p className="mt-[var(--space-2)] max-w-[42ch] text-[var(--fg-muted)]">{step.body}</p>
                  <div aria-hidden="true" className="mt-[var(--space-5)]">{step.scene}</div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
