import type { ReactNode } from "react";
import { SkipLink } from "./AppShell";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/**
 * The signed-out frame, the counterpart of AppShell: same header component, same page
 * frame, same colophon. `bare` hands the whole width to the page, for pages built from
 * full-bleed sections that set their own frame.
 */
export function PublicShell({
  children,
  bare = false,
}: {
  children: ReactNode;
  bare?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <SiteHeader />
      <main id="main" className={bare ? "flex-1" : "page-frame flex-1 py-[var(--space-12)]"}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
