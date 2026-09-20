import Link from "next/link";
import { redirect } from "next/navigation";
import { DemoButton } from "@/components/DemoButton";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * A minimal entry page.
 *
 * Not the full landing experience — the hero, feature and showcase sections belong to
 * the frontend checkpoint, and building them now would mean inventing book imagery
 * before the catalogue is reachable over HTTP. This exists so the authentication
 * entry points have a coherent home.
 */
export default async function LandingPage() {
  if (await getCurrentUser()) redirect("/home");

  return (
    <main className="mx-auto flex min-h-dvh max-w-[1100px] flex-col justify-between
                     px-[var(--space-4)] py-[var(--space-8)] sm:px-[var(--space-8)]">
      <header>
        <span className="font-serif text-lg tracking-tight">goodreads</span>
        <span className="ml-2 align-middle text-xs uppercase tracking-[0.12em] text-[var(--ink-60)]">
          redesign
        </span>
      </header>

      <div className="max-w-[20ch] py-[var(--space-16)]">
        <h1 className="text-[clamp(2.5rem,9vw,5rem)] leading-[1.05]">
          A better home for your reading life.
        </h1>

        <p className="mt-[var(--space-6)] max-w-[44ch] text-lg leading-relaxed text-[var(--ink-70)]">
          Discover books worth reading. Keep track of what you read. Build a reading
          history that stays yours.
        </p>

        <div className="mt-[var(--space-8)] flex flex-col gap-[var(--space-3)] sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex min-h-[44px] items-center justify-center
                       rounded-[var(--radius-input)] bg-[var(--forest)]
                       px-[var(--space-6)] text-base font-medium text-[var(--ivory)]
                       no-underline transition-colors duration-[var(--motion-fast)]
                       hover:bg-[var(--forest-hover)]"
          >
            Create an account
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-[44px] items-center justify-center
                       rounded-[var(--radius-input)] border border-[var(--border-strong)]
                       px-[var(--space-6)] text-base font-medium text-[var(--ink)]
                       no-underline transition-colors duration-[var(--motion-fast)]
                       hover:bg-[var(--paper)]"
          >
            Sign in
          </Link>
          <DemoButton />
        </div>
      </div>

      <footer className="max-w-[60ch] text-xs leading-relaxed text-[var(--ink-60)]">
        An independent product redesign and software-engineering case study. Not
        affiliated with Goodreads or Amazon, and no Goodreads data is used. Book
        information comes from{" "}
        <a
          href="https://openlibrary.org"
          className="text-[var(--ink-70)] underline underline-offset-2"
        >
          Open&nbsp;Library
        </a>
        .
      </footer>
    </main>
  );
}
