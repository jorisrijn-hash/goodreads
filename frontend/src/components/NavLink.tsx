"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * A header link that knows when it is the current page. The mark is a rule under the
 * label rather than a colour change alone, so it survives greyscale and forced colours,
 * and aria-current tells assistive technology the same thing.
 */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative inline-flex min-h-[44px] items-center whitespace-nowrap
                  px-[var(--space-2)] text-[0.875rem] no-underline
                  transition-colors duration-[var(--motion-fast)] sm:px-[var(--space-3)]
                  ${active ? "text-[var(--fg)]" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}
    >
      {children}
      <span
        aria-hidden="true"
        className={`absolute inset-x-[var(--space-2)] bottom-[10px] h-px bg-current
                    transition-opacity duration-[var(--motion-base)] sm:inset-x-[var(--space-3)]
                    ${active ? "opacity-100" : "opacity-0"}`}
      />
    </Link>
  );
}
