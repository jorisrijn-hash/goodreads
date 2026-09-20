import Link from "next/link";

/**
 * The logged-out header. Quiet, but with enough presence to read as a masthead rather
 * than a stray line of text.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-[var(--border)]">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-[var(--space-4)]
                      px-[var(--space-5)] py-[var(--space-4)] sm:px-[var(--space-8)] lg:px-[var(--space-12)]">
        <Link href="/" className="group no-underline">
          <span className="block font-serif text-[1.375rem] leading-none tracking-[-0.01em] text-[var(--ink)]">
            goodreads
          </span>
          <span className="mt-[6px] block text-[0.625rem] uppercase tracking-[0.2em] text-[var(--ink-60)]">
            Independent redesign
          </span>
        </Link>

        <nav aria-label="Main">
          <ul className="flex items-center gap-[var(--space-1)] sm:gap-[var(--space-4)]">
            <li>
              <Link
                href="/discover"
                className="inline-flex min-h-[44px] items-center rounded-[var(--radius-input)]
                           px-[var(--space-3)] text-sm text-[var(--ink-70)] no-underline
                           transition-colors duration-[var(--motion-fast)]
                           hover:bg-[var(--paper)] hover:text-[var(--ink)]"
              >
                Discover
              </Link>
            </li>
            <li>
              <Link
                href="/login"
                className="inline-flex min-h-[44px] items-center rounded-[var(--radius-input)]
                           px-[var(--space-3)] text-sm font-medium text-[var(--ink)] no-underline
                           transition-colors duration-[var(--motion-fast)] hover:bg-[var(--paper)]"
              >
                Sign in
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
