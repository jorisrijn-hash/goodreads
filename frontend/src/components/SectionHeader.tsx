import type { ReactNode } from "react";

/**
 * A section's running head: its number and its label, with a rule between that draws
 * itself in when the section is revealed. The number is there because the landing page
 * reads as a sequence of chapters.
 */
export function SectionLabel({ number, label, centered = false }: { number: string; label: string; centered?: boolean }) {
  return (
    <p className={`flex items-center gap-[var(--space-3)] text-[var(--fg-subtle)] ${centered ? "justify-center" : ""}`}>
      <span className="type-folio">{number}</span>
      <span aria-hidden="true" className="draw-rule h-px w-10 bg-[var(--rule-strong)]" />
      <span className="type-label">{label}</span>
    </p>
  );
}

/** The label with a display heading beneath it, for sections led by their words. */
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
      <SectionLabel number={number} label={label} />
      <h2 className="type-display-l mt-[var(--space-6)] max-w-[16ch] text-balance">{children}</h2>
    </div>
  );
}
