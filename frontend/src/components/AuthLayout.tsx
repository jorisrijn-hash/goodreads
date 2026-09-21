import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLockup } from "./Brand";

/**
 * The authentication shell.
 *
 * Structurally inspired by a split auth layout, but rebuilt in this project's language:
 * ivory and paper surfaces, ink text, a single forest action colour, and an editorial
 * serif for the heading. No gradients, no glass, no stock photography.
 *
 * Covers are not used here yet — they are stored on disk and have no HTTP endpoint
 * until the catalogue API lands, and inventing imagery to fill the panel would be
 * exactly the kind of decoration this project avoids.
 */
export function AuthLayout({
  title, intro, children, footer,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  /** Anything else under the form. The credential disclaimer is always shown. */
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[1fr_minmax(420px,560px)]">
      {/*
        Editorial panel. Hidden below md: on a phone the form is the only thing that
        matters, and a decorative column would push it below the fold.
      */}
      <aside
        className="hidden bg-[var(--paper)] px-[var(--space-12)] py-[var(--space-16)] md:flex
                   md:flex-col md:justify-between"
      >
        {/* Never the wordmark alone beside a password field: the "g" and the label. */}
        <Link href="/" className="self-start no-underline" aria-label="goodreads — independent redesign, home">
          <BrandLockup mark="g" />
        </Link>

        <blockquote className="max-w-[34ch]">
          <p className="font-serif text-[clamp(1.75rem,2.6vw,2.5rem)] leading-[1.2] text-[var(--ink)]">
            Your reading life deserves more than a list.
          </p>
          <footer className="mt-[var(--space-6)] text-sm leading-relaxed text-[var(--ink-70)]">
            An independent redesign exploring how tracking what you read could feel less
            like maintaining a database and more like keeping a journal.
          </footer>
        </blockquote>

        <p className="text-xs leading-relaxed text-[var(--ink-60)]">
          An independent case study. Not affiliated with Goodreads or Amazon.
          Book data from Open&nbsp;Library.
        </p>
      </aside>

      <main className="flex min-h-dvh flex-col justify-center px-[var(--space-4)] py-[var(--space-12)] sm:px-[var(--space-8)]">
        <div className="mx-auto w-full max-w-[400px]">
          {/* Only shown where the editorial panel is not. */}
          <Link href="/" className="mb-[var(--space-8)] inline-block no-underline md:hidden" aria-label="goodreads — independent redesign, home">
            <BrandLockup mark="g" />
          </Link>

          <h1 className="text-[clamp(1.75rem,5vw,2.25rem)]">{title}</h1>
          {intro && (
            <p className="mt-[var(--space-3)] text-[var(--ink-70)]">{intro}</p>
          )}

          <div className="mt-[var(--space-8)]">{children}</div>

          {/* Directly beside the credentials, not only in a footer somewhere. */}
          <p
            role="note"
            className="mt-[var(--space-6)] border-l-2 border-[var(--burgundy)] pl-[var(--space-4)] text-[0.875rem] leading-relaxed text-[var(--ink-70)]"
          >
            Independent redesign — not affiliated with Goodreads or Amazon. Use credentials
            created for this demo, not your Goodreads password.
          </p>

          {footer && (
            <div className="mt-[var(--space-8)] text-sm text-[var(--ink-70)]">
              {footer}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
