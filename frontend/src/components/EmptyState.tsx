import Link from "next/link";
import type { ReactNode } from "react";

/**
 * An empty state that helps rather than reports.
 *
 * "No data" tells a reader nothing they cannot already see. Every one of these says what
 * is missing and offers the next step.
 */
export function EmptyState({
  title,
  body,
  action,
  children,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <div className="border-l-2 border-[var(--border-strong)] py-[var(--space-2)] pl-[var(--space-5)]">
      <h2 className="font-serif text-[1.375rem] text-[var(--ink)]">{title}</h2>
      <p className="mt-[var(--space-2)] max-w-[52ch] leading-relaxed text-[var(--ink-70)]">
        {body}
      </p>
      {action && (
        <Link
          href={action.href}
          className="mt-[var(--space-5)] inline-flex min-h-[44px] items-center
                     rounded-[var(--radius-input)] bg-[var(--forest)] px-[var(--space-6)]
                     text-base font-medium text-[var(--ivory)] no-underline
                     transition-colors duration-[var(--motion-fast)]
                     hover:bg-[var(--forest-hover)]"
        >
          {action.label}
        </Link>
      )}
      {children}
    </div>
  );
}
