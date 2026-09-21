import Link from "next/link";
import type { ReactNode } from "react";
import type { ApiUser } from "@/lib/api";
import { AvatarMenu } from "./AvatarMenu";

/**
 * The authenticated frame.
 *
 * Home is the only destination here. Discover, My Library and Journal are not built
 * yet, and a navigation bar full of links that lead nowhere reads as a broken product
 * rather than an unfinished one — so they are absent until their checkpoint lands.
 */
export function AppShell({ user, children }: { user: ApiUser; children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      {/* Lets a keyboard user reach the content without tabbing the whole header. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50
                   focus:rounded-[var(--radius-input)] focus:bg-[var(--forest)]
                   focus:px-[var(--space-4)] focus:py-[var(--space-2)] focus:text-[var(--ivory)]"
      >
        Skip to content
      </a>

      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between
                        px-[var(--space-4)] py-[var(--space-3)] sm:px-[var(--space-8)]">
          <Link
            href="/home"
            className="font-serif text-lg tracking-tight text-[var(--ink)] no-underline"
          >
            goodreads
          </Link>

          <nav aria-label="Main">
            <ul className="flex items-center gap-[var(--space-1)] sm:gap-[var(--space-2)]">
              {[
                { href: "/home", label: "Home" },
                { href: "/discover", label: "Discover" },
                { href: "/library", label: "My Library" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-[44px] items-center whitespace-nowrap
                               rounded-[var(--radius-input)] px-[var(--space-2)]
                               text-[0.9375rem] text-[var(--ink)] no-underline
                               transition-colors duration-[var(--motion-fast)]
                               hover:bg-[var(--paper)] sm:px-[var(--space-3)] sm:text-base"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <AvatarMenu user={user} />
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1100px] px-[var(--space-4)] py-[var(--space-12)] sm:px-[var(--space-8)]">
        {children}
      </main>
    </div>
  );
}
