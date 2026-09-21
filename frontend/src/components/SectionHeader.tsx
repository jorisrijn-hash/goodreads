import type { ReactNode } from "react";

/**
 * A section's running head: its number, its label, and its heading. The number is there
 * because the landing page reads as a sequence of chapters; the label says what the
 * chapter is about in the product's own words.
 */
export function SectionHeader({
  number,
  label,
  children,
  className = "",
}: {
  number: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="flex items-center gap-[var(--space-3)] text-[var(--fg-subtle)]">
        <span className="type-folio">{number}</span>
        <span aria-hidden="true" className="h-px w-10 bg-[var(--rule-strong)]" />
        <span className="type-label">{label}</span>
      </p>
      <h2 className="type-display-l mt-[var(--space-6)] max-w-[16ch] text-balance">{children}</h2>
    </div>
  );
}
