import type { ReactNode } from "react";
import type { ApiUser } from "@/lib/api";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/**
 * The signed-in frame: the application header, the page, the colophon.
 */
export function AppShell({ user, children }: { user: ApiUser; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <SiteHeader user={user} />
      <main id="main" className="page-frame flex-1 py-[var(--space-12)]">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

/** Lets a keyboard user reach the content without tabbing through the header. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50
                 focus:rounded-[var(--radius-input)] focus:bg-[var(--forest)]
                 focus:px-[var(--space-4)] focus:py-[var(--space-2)] focus:text-[var(--ivory)]"
    >
      Skip to content
    </a>
  );
}
