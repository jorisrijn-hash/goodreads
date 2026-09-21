/**
 * Figures set like a book's publication details: a number, a small-caps label, a rule
 * above. Not dashboard cards — these are facts about the thing, stated quietly.
 */
export function Ledger({
  items,
  className = "",
}: {
  items: { label: string; value: number }[];
  className?: string;
}) {
  return (
    <dl className={`flex flex-wrap gap-x-[var(--space-10)] gap-y-[var(--space-4)] border-t border-[var(--rule)] pt-[var(--space-5)] ${className}`}>
      {items.map((item) => (
        // dt first for assistive technology; shown number-first.
        <div key={item.label} className="flex flex-col-reverse">
          <dt className="type-label mt-[var(--space-2)] text-[var(--fg-subtle)]">{item.label}</dt>
          <dd className="m-0 font-serif text-[clamp(1.625rem,2.4vw,2.125rem)] leading-none tracking-[-0.02em] text-[var(--fg)] [font-variant-numeric:lining-nums_tabular-nums]">
            {item.value.toLocaleString("en")}
          </dd>
        </div>
      ))}
    </dl>
  );
}
