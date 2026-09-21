import Link from "next/link";
import type { ApiUser } from "@/lib/api";
import { AvatarMenu } from "./AvatarMenu";
import { BrandLockup } from "./Brand";
import { NavLink } from "./NavLink";

/**
 * The one header, in two modes.
 *
 * Signed out it is a masthead with a way in; signed in it is the application's
 * navigation. It used to be two unrelated components that shared nothing but a
 * wordmark. `tone="forest"` paints it for a page whose first section is dark, so the
 * header and that section read as one surface rather than a light bar on a dark page.
 *
 * Journal stays absent until it exists: a link that leads nowhere reads as broken.
 */
export function SiteHeader({
  user,
  tone = "ivory",
}: {
  user?: ApiUser | null;
  tone?: "ivory" | "forest";
}) {
  return (
    <header data-surface={tone} className="relative z-20 border-b border-[var(--rule)]">
      <div className="page-frame flex h-[68px] items-center justify-between gap-[var(--space-3)]">
        <Link href={user ? "/home" : "/"} className="shrink-0 no-underline" aria-label="goodreads, independent redesign, home">
          {/* The supplied wordmark, always with the redesign label beside it. */}
          <BrandLockup tone={tone === "forest" ? "ivory" : "ink"} compactBelow="sm" labelOnCompact={!user} />
        </Link>

        <nav aria-label="Main">
          <ul className="flex list-none items-center gap-[var(--space-1)] p-0 sm:gap-[var(--space-2)]">
            {user ? (
              <>
                <li><NavLink href="/home">Home</NavLink></li>
                <li><NavLink href="/discover">Discover</NavLink></li>
                <li><NavLink href="/library">My Library</NavLink></li>
                <li className="hidden sm:block">
                  <Link
                    href="/discover"
                    aria-label="Search the catalogue"
                    className="inline-flex h-[44px] w-[44px] items-center justify-center
                               rounded-[var(--radius-input)] text-[var(--fg-muted)]
                               transition-colors duration-[var(--motion-fast)]
                               hover:bg-[var(--wash)] hover:text-[var(--fg)]"
                  >
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <circle cx="11" cy="11" r="6.5" />
                      <path d="m16 16 4.5 4.5" />
                    </svg>
                  </Link>
                </li>
                <li className="ml-[var(--space-1)]"><AvatarMenu user={user} /></li>
              </>
            ) : (
              <>
                <li><NavLink href="/discover">Discover</NavLink></li>
                <li><NavLink href="/login">Sign in</NavLink></li>
                <li className="ml-[var(--space-2)] hidden sm:block">
                  <Link
                    href="/signup"
                    className={`inline-flex min-h-[40px] items-center rounded-[var(--radius-input)]
                                px-[var(--space-4)] text-[0.875rem] font-medium no-underline
                                transition-colors duration-[var(--motion-fast)]
                                ${tone === "forest"
                                  ? "bg-[var(--ivory)] text-[var(--forest)] hover:bg-[var(--paper)]"
                                  : "bg-[var(--forest)] text-[var(--ivory)] hover:bg-[var(--forest-hover)]"}`}
                  >
                    Create account
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
