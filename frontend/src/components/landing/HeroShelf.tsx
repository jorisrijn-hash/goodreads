"use client";

import { m, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef } from "react";
import type { BookDetail } from "@/lib/api";
import { DURATION, EASE_SETTLE, PARALLAX_MAX, STAGGER, TILT_MAX_DEG } from "@/lib/motion";
import { BookObject } from "../BookObject";
import { MotionProvider } from "../motion/MotionProvider";

/** Where one book stands. Percentages of the stage; width as a CSS length. */
export type Placement = {
  left: string;
  width: string;
  turn: number;
  /** 0–1: how far forward the book stands, which scales its response to the pointer. */
  depth: number;
  /** Lift above the ledge line, for a book standing in front of the others. */
  bottom?: string;
  z: number;
};

export type ShelfBook = { book: BookDetail; ratio: number; placement: Placement };

/**
 * The landing composition: real books standing on a ledge.
 *
 * The one place on the landing page that uses Motion, and only for what CSS does not do
 * well: a sequenced rise with slightly different settling times, and a pointer-driven
 * depth that eases rather than snaps. The spring is overdamped (damping ratio ≈ 1.4), so
 * it settles without a bounce. Neither runs for touch pointers or reduced motion.
 */
export function HeroShelf({
  books,
  sizes,
  ledge,
  startDelay = 0.5,
  interactive = true,
}: {
  books: ShelfBook[];
  sizes: string;
  ledge: { left: string; right: string; bottom: string };
  /** Seconds before the first book rises: after the text has settled. */
  startDelay?: number;
  interactive?: boolean;
}) {
  return (
    <MotionProvider>
      <Stage books={books} sizes={sizes} ledge={ledge} startDelay={startDelay} interactive={interactive} />
    </MotionProvider>
  );
}

function Stage({
  books, sizes, ledge, startDelay, interactive,
}: {
  books: ShelfBook[];
  sizes: string;
  ledge: { left: string; right: string; bottom: string };
  startDelay: number;
  interactive: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, { stiffness: 140, damping: 34 });
  const y = useSpring(pointerY, { stiffness: 140, damping: 34 });

  useEffect(() => {
    if (!interactive || reduced || !window.matchMedia("(pointer: fine)").matches) return;
    function onMove(event: PointerEvent) {
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      const nx = (event.clientX - (box.left + box.width / 2)) / (box.width / 2);
      const ny = (event.clientY - (box.top + box.height / 2)) / (box.height / 2);
      pointerX.set(Math.max(-1, Math.min(1, nx)));
      pointerY.set(Math.max(-1, Math.min(1, ny)));
    }
    function onLeave() {
      pointerX.set(0);
      pointerY.set(0);
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [interactive, reduced, pointerX, pointerY]);

  return (
    <div ref={ref} className="book-stage absolute inset-0">
      <div className="ledge" style={{ left: ledge.left, right: ledge.right, bottom: `calc(${ledge.bottom} - 18px)` }} />
      {books.map(({ book, ratio, placement }, index) => (
        <ShelfItem
          key={book.slug}
          book={book}
          ratio={ratio}
          placement={placement}
          sizes={sizes}
          ledgeBottom={ledge.bottom}
          delay={startDelay + index * STAGGER}
          // Slightly different settling times, so the row does not land as one block.
          duration={DURATION.settle + (index % 3) * 0.05}
          x={x}
          y={y}
          priority={index >= 2 && index <= 4}
        />
      ))}
    </div>
  );
}

function ShelfItem({
  book, ratio, placement, sizes, ledgeBottom, delay, duration, x, y, priority,
}: {
  book: BookDetail;
  ratio: number;
  placement: Placement;
  sizes: string;
  ledgeBottom: string;
  delay: number;
  duration: number;
  x: MotionValue<number>;
  y: MotionValue<number>;
  priority: boolean;
}) {
  const shiftX = useTransform(x, (v) => v * PARALLAX_MAX * placement.depth);
  const shiftY = useTransform(y, (v) => v * (PARALLAX_MAX / 2) * placement.depth);
  const tilt = useTransform(x, (v) => v * TILT_MAX_DEG * placement.depth);

  return (
    // Outer: where the book stands, and its entrance. Inner: the pointer's depth. Kept
    // apart because both move the book vertically and would otherwise fight.
    <m.div
      data-motion-initial=""
      className="absolute"
      style={{
        left: placement.left,
        bottom: placement.bottom ? `calc(${ledgeBottom} + ${placement.bottom})` : ledgeBottom,
        zIndex: placement.z,
        transformStyle: "preserve-3d",
      }}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, ease: EASE_SETTLE, delay }}
    >
      <m.div style={{ x: shiftX, y: shiftY, rotateY: tilt, transformStyle: "preserve-3d" }}>
        <BookObject
          slug={book.slug}
          title={book.title}
          authors={book.authors}
          coverKey={book.coverKey}
          pageCount={book.pageCount}
          width={placement.width}
          ratio={ratio}
          turn={placement.turn}
          priority={priority}
          sizes={sizes}
        />
      </m.div>
    </m.div>
  );
}
