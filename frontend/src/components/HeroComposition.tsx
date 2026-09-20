"use client";

import { useEffect, useRef, useState } from "react";

/**
 * TEMPORARY — replaced in Checkpoint D13 by real catalogue covers.
 *
 * The catalogue exists but has no HTTP endpoint yet, so there is nothing real to show
 * here. Rather than invent covers, titles or ratings, this is an unmistakably blank
 * editorial composition: paper planes, a spine rule, small-caps marks and folio numbers.
 *
 * Every plane is already a 2:3 book-cover rectangle with the same stagger, depth and
 * hover behaviour the real thing will need. Replacing this means swapping each plane's
 * inner content for a <BookCover>; the geometry and motion stay as they are.
 */

type Plane = {
  /** Horizontal offset within the composition box, in percent. */
  x: number;
  /** How far the plane is lifted off the shelf line, in percent. Books rest on a
   *  shelf; they do not float through it. */
  lift: number;
  /** Relative size, 1 = base. */
  scale: number;
  /** Depth: larger values drift further with the pointer. */
  depth: number;
  rotate: number;
  mark: string;
  folio: string;
};

const SHELF_FROM_BOTTOM = 10; // percent

const PLANES: Plane[] = [
  { x: -2, lift: 0, scale: 0.78, depth: 0.35, rotate: -2.2, mark: "I",   folio: "001" },
  { x: 20, lift: 0, scale: 1.0,  depth: 0.95, rotate: 0.7,  mark: "II",  folio: "058" },
  { x: 48, lift: 0, scale: 0.86, depth: 0.65, rotate: -1.1, mark: "III", folio: "144" },
  { x: 71, lift: 0, scale: 0.72, depth: 0.45, rotate: 1.9,  mark: "IV",  folio: "232" },
];

export function HeroComposition() {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // A pointer that cannot hover (touch) gets no parallax; there is nothing to track.
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (reduced || !finePointer) return;

    let frame = 0;
    function onPointerMove(event: PointerEvent) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = ref.current?.getBoundingClientRect();
        if (!box) return;
        // -1..1 relative to the composition's centre.
        const x = (event.clientX - (box.left + box.width / 2)) / (box.width / 2);
        const y = (event.clientY - (box.top + box.height / 2)) / (box.height / 2);
        // Deliberately small: a few pixels of drift, not a parallax showpiece.
        setOffset({ x: Math.max(-1, Math.min(1, x)) * 6, y: Math.max(-1, Math.min(1, y)) * 6 });
      });
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="hero-composition relative aspect-[7/5] w-full select-none"
    >
      {/* The shelf: one rule the planes rest on, with a hairline of board beneath it. */}
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
          className="hero-plane absolute"
          style={{
            left: `${plane.x}%`,
            // Anchored to the shelf rather than the top of the box, so every plane
            // stands on the same line no matter its height.
            bottom: `calc(${SHELF_FROM_BOTTOM}% + ${plane.lift}%)`,
            width: `${33 * plane.scale}%`,
            transformOrigin: "bottom center",
            transform: `translate3d(${offset.x * plane.depth}px, ${
              offset.y * plane.depth
            }px, 0) rotate(${plane.rotate}deg)`,
            animationDelay: `${index * 90}ms`,
            zIndex: Math.round(plane.depth * 10),
          }}
        >
          {/* 2:3 — the aspect ratio of the covers that will replace these. */}
          <div
            className="relative flex aspect-[2/3] flex-col justify-between overflow-hidden
                       border border-[var(--border-strong)] bg-[var(--paper)]
                       px-[var(--space-3)] py-[var(--space-4)]"
            style={{ boxShadow: "0 18px 40px -22px rgba(25, 24, 21, 0.55)" }}
          >
            {/* The spine, darker than the board so the plane reads as a bound object. */}
            <span className="absolute inset-y-0 left-0 w-[7%] bg-[var(--border)]" />
            <span className="absolute inset-y-0 left-[7%] w-px bg-[var(--border-strong)] opacity-70" />

            <span className="ml-[12%] text-[0.6rem] uppercase tracking-[0.24em] text-[var(--ink-60)]">
              {plane.mark}
            </span>

            {/* A title block: two rules where a title and author will go. */}
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
