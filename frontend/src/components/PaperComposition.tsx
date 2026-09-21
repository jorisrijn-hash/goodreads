"use client";

/**
 * The hero's fallback when the catalogue cannot be reached.
 *
 * <p>Used only when the API returns nothing — in production before the backend is
 * deployed, or if it is down. Deliberately blank paper: spines, title-block rules and
 * folio numbers, with no invented covers, titles or authors. It reads as "no books
 * loaded", which is true, rather than leaving the hero an empty field.
 *
 * <p>Geometry matches {@link HeroComposition} exactly, so the two are interchangeable.
 */
const PLANES = [
  { x: -2, scale: 0.78, rotate: -2.2, mark: "I", folio: "001" },
  { x: 20, scale: 1.0, rotate: 0.7, mark: "II", folio: "058" },
  { x: 48, scale: 0.86, rotate: -1.1, mark: "III", folio: "144" },
  { x: 71, scale: 0.72, rotate: 1.9, mark: "IV", folio: "232" },
];

const SHELF_FROM_BOTTOM = 10;

export function PaperComposition() {
  return (
    <div aria-hidden="true" className="relative aspect-[7/5] w-full select-none">
      <div
        className="absolute inset-x-[-6%] h-px bg-[var(--border-strong)] opacity-55"
        style={{ bottom: `${SHELF_FROM_BOTTOM}%` }}
      />
      <div
        className="absolute inset-x-[-6%] h-[3px] bg-[var(--border)] opacity-70"
        style={{ bottom: `calc(${SHELF_FROM_BOTTOM}% - 3px)` }}
      />

      {PLANES.map((plane, index) => (
        <figure
          key={plane.mark}
          className="hero-plane absolute m-0"
          style={{
            left: `${plane.x}%`,
            bottom: `${SHELF_FROM_BOTTOM}%`,
            width: `${33 * plane.scale}%`,
            transform: `rotate(${plane.rotate}deg)`,
            transformOrigin: "bottom center",
            animationDelay: `${index * 90}ms`,
          }}
        >
          <div
            className="relative flex aspect-[2/3] flex-col justify-between overflow-hidden
                       border border-[var(--border-strong)] bg-[var(--paper)]
                       px-[var(--space-3)] py-[var(--space-4)]"
            style={{ boxShadow: "0 18px 40px -22px rgba(25, 24, 21, 0.55)" }}
          >
            <span className="absolute inset-y-0 left-0 w-[7%] bg-[var(--border)]" />
            <span className="absolute inset-y-0 left-[7%] w-px bg-[var(--border-strong)] opacity-70" />
            <span className="ml-[12%] text-[0.6rem] uppercase tracking-[0.24em] text-[var(--ink-60)]">
              {plane.mark}
            </span>
            <span className="ml-[12%] mr-[8%] flex flex-col gap-[6px]">
              <span className="h-px w-full bg-[var(--border-strong)] opacity-50" />
              <span className="h-px w-2/3 bg-[var(--border-strong)] opacity-35" />
            </span>
            <span className="ml-[12%] font-serif text-[0.7rem] text-[var(--ink-60)]">
              {plane.folio}
            </span>
          </div>
        </figure>
      ))}
    </div>
  );
}
