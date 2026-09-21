import Link from "next/link";
import { redirect } from "next/navigation";
import { DemoButton } from "@/components/DemoButton";
import { HeroComposition } from "@/components/HeroComposition";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/session";
import type { BookPage } from "@/lib/api";
import { fetchPublic } from "@/lib/server-api";

export const dynamic = "force-dynamic";

/**
 * The entry page.
 *
 * Hero only. The feature, showcase, how-it-works and FAQ sections all describe
 * functionality that does not exist yet, and writing them now would be marketing copy
 * for a product that cannot do what it claims. They arrive once the catalogue does.
 */
export default async function LandingPage() {
  if (await getCurrentUser()) redirect("/home");

  // Real books from our own catalogue. A deterministic query, not a recommendation:
  // nothing here is personalised and nothing claims to be.
  const featured = await fetchPublic<BookPage>("/api/v1/books?genre=classics&size=4", 3600);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex flex-1 items-center">
        <div
          className="mx-auto grid w-full max-w-[1320px] items-center gap-[var(--space-12)]
                     px-[var(--space-5)] py-[var(--space-12)] sm:px-[var(--space-8)]
                     lg:grid-cols-[minmax(0,52fr)_minmax(0,48fr)] lg:gap-[var(--space-16)]
                     lg:px-[var(--space-12)] lg:py-[var(--space-16)]"
        >
          <div className="hero-enter">
            <p className="text-[0.6875rem] uppercase tracking-[0.2em] text-[var(--ink-60)]">
              A product &amp; engineering case study
            </p>

            {/*
              text-wrap: balance evens the lines out instead of leaving a one-word orphan,
              and the max-width keeps it to two or three lines rather than a long ribbon.
            */}
            {/*
              The break is authored: "A better home / for your reading life." is the
              intended reading, and the type size is chosen so the second line fits the
              column rather than orphaning a word. Left to itself the browser breaks
              wherever the column happens to end.
            */}
            <h1 className="mt-[var(--space-5)] text-[clamp(2rem,4.6vw,3.5rem)] leading-[1.08] tracking-[-0.02em]">
              A better home
              <span className="block">for your reading life.</span>
            </h1>

            <p className="mt-[var(--space-6)] max-w-[46ch] text-[1.0625rem] leading-[1.65] text-[var(--ink-70)] sm:text-[1.125rem]">
              Discover books worth reading. Keep track of what you read. Build a reading
              history that stays yours.
            </p>

            <div className="mt-[var(--space-8)] flex flex-wrap items-center gap-[var(--space-3)]">
              <Link
                href="/signup"
                className="inline-flex min-h-[52px] items-center justify-center whitespace-nowrap
                           rounded-[var(--radius-input)] bg-[var(--forest)] px-[var(--space-8)]
                           text-base font-medium text-[var(--ivory)] no-underline
                           transition-colors duration-[var(--motion-fast)]
                           hover:bg-[var(--forest-hover)]"
              >
                Create an account
              </Link>

              <DemoButton label="Explore demo" size="large" />

              <Link
                href="/login"
                className="inline-flex min-h-[52px] items-center justify-center whitespace-nowrap
                           px-[var(--space-2)] text-base text-[var(--ink-70)] underline
                           underline-offset-[6px] decoration-[var(--border-strong)]
                           transition-colors duration-[var(--motion-fast)]
                           hover:text-[var(--ink)] hover:decoration-[var(--ink)]"
              >
                Sign in
              </Link>
            </div>

            <p className="mt-[var(--space-8)] max-w-[52ch] border-t border-[var(--border)]
                          pt-[var(--space-5)] text-[0.8125rem] leading-relaxed text-[var(--ink-60)]">
              An independent redesign, not affiliated with Goodreads or Amazon. No
              Goodreads data is used — the catalogue comes from{" "}
              <a
                href="https://openlibrary.org"
                className="text-[var(--ink-70)] underline underline-offset-2"
              >
                Open&nbsp;Library
              </a>
              .
            </p>
          </div>

          {/* Hidden on small screens, where the headline and actions are the only
              things that matter. */}
          {featured && featured.items.length > 0 && (
            <div className="hero-enter hero-enter-delayed hidden lg:block">
              <HeroComposition books={featured.items} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
