"use client";

import { m, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef } from "react";
import type { BookDetail } from "@/lib/api";
import { PARALLAX_MAX, STAGGER } from "@/lib/motion";
import { CoverPrint } from "../CoverPrint";
import { MotionProvider } from "../motion/MotionProvider";

/** Where a cover lies in the collage: percentages of the collage box, a CSS width. */
export type CollagePlacement = {
  left: string;
  /** From the top, or (for books standing on the floor of the box) from the bottom. */
  top?: string;
  bottom?: string;
  width: string;
  rotate: number;
  z: number;
  /** 0–1: how much it answers the pointer. Larger, nearer covers move more. */
  depth: number;
};

export type CollageBook = { book: BookDetail; ratio: number; placement: CollagePlacement };

/**
 * Real covers laid down by hand: a mosaic with gaps and the odd overlap, not a shelf.
 *
 * The covers settle in one after another (CSS, on first paint), then shift a few pixels
 * with the pointer, nearer ones more: the one thing Motion does here, with an overdamped
 * spring so nothing bounces. No tilt, no 3D. The shift is off for touch pointers and
 * reduced motion.
 */
export function CoverCollage(props: {
  books: CollageBook[];
  sizes: string;
  startDelay?: number;
  interactive?: boolean;
  priority?: boolean;
  media?: string;
}) {
  return (
    <MotionProvider>
      <Collage {...props} />
    </MotionProvider>
  );
}

function Collage({
  books, sizes, startDelay = 0.45, interactive = true, priority = true, media,
}: {
  books: CollageBook[];
  sizes: string;
  startDelay?: number;
  interactive?: boolean;
  priority?: boolean;
  media?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, { stiffness: 120, damping: 32 });
  const y = useSpring(pointerY, { stiffness: 120, damping: 32 });

  useEffect(() => {
    if (!interactive || reduced || !window.matchMedia("(pointer: fine)").matches) return;
    function onMove(event: PointerEvent) {
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      pointerX.set(Math.max(-1, Math.min(1, (event.clientX - (box.left + box.width / 2)) / (box.width / 2))));
      pointerY.set(Math.max(-1, Math.min(1, (event.clientY - (box.top + box.height / 2)) / (box.height / 2))));
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [interactive, reduced, pointerX, pointerY]);

  // The largest covers are the ones visible first; load those eagerly.
  const eager = new Set(
    [...books].sort((a, b) => b.placement.depth - a.placement.depth).slice(0, 3).map((b) => b.book.slug),
  );

  return (
    <div ref={ref} className="absolute inset-0">
      {books.map(({ book, ratio, placement }, index) => (
        <Item
          key={book.slug}
          book={book}
          ratio={ratio}
          placement={placement}
          sizes={sizes}
          delay={startDelay + index * STAGGER}
          x={x}
          y={y}
          priority={priority && eager.has(book.slug)}
          media={media}
        />
      ))}
    </div>
  );
}

function Item({
  book, ratio, placement, sizes, delay, x, y, priority, media,
}: {
  book: BookDetail;
  ratio: number;
  placement: CollagePlacement;
  sizes: string;
  delay: number;
  x: MotionValue<number>;
  y: MotionValue<number>;
  priority: boolean;
  media?: string;
}) {
  const shiftX = useTransform(x, (v) => v * PARALLAX_MAX * placement.depth);
  const shiftY = useTransform(y, (v) => v * (PARALLAX_MAX / 2) * placement.depth);
  // Nearer books also turn very slightly toward the pointer: under a degree at most.
  const turn = useTransform(x, (v) => v * 0.7 * placement.depth);

  return (
    // Outer: position and entrance. Inner: the pointer's shift. Kept apart because both
    // move the cover vertically and would otherwise fight.
    // The entrance is CSS, so covers paint on the first frame without waiting for
    // JavaScript (they are the page's largest images); Motion only drives the shift.
    <div
      className="collage-item collage-enter absolute"
      style={{ left: placement.left, top: placement.top, bottom: placement.bottom, zIndex: placement.z, animationDelay: `${delay}s` }}
    >
      <m.div style={{ x: shiftX, y: shiftY, rotate: turn }}>
        <CoverPrint
          slug={book.slug}
          title={book.title}
          authors={book.authors}
          coverKey={book.coverKey}
          width={placement.width}
          ratio={ratio}
          rotate={placement.rotate}
          priority={priority}
          sizes={sizes}
          media={media}
        />
      </m.div>
    </div>
  );
}
