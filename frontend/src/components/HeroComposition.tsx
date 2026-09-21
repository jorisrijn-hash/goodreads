"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Book } from "@/lib/api";
import { BookCover } from "./BookCover";

/**
 * The landing hero's book composition.
 *
 * <p>Real books from our own catalogue, with covers served from our own storage. Nothing
 * here is a placeholder or an invented title, and no rating, review count or popularity
 * figure is shown, because we hold none.
 *
 * <p>Arranged as volumes standing on a shelf rather than a floating product collage: a
 * shared baseline, slight rotation, overlapping depth. The parallax is a few pixels and
 * is skipped entirely for touch pointers and reduced-motion readers.
 */

type Placement = { x: number; scale: number; depth: number; rotate: number };

const PLACEMENTS: Placement[] = [
  { x: -2, scale: 0.78, depth: 0.35, rotate: -2.2 },
  { x: 20, scale: 1.0, depth: 0.95, rotate: 0.7 },
  { x: 48, scale: 0.86, depth: 0.65, rotate: -1.1 },
  { x: 71, scale: 0.72, depth: 0.45, rotate: 1.9 },
];

const SHELF_FROM_BOTTOM = 10; // percent

export function HeroComposition({ books }: { books: Book[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (reduced || !finePointer) return;

    let frame = 0;
    function onPointerMove(event: PointerEvent) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = ref.current?.getBoundingClientRect();
        if (!box) return;
        const x = (event.clientX - (box.left + box.width / 2)) / (box.width / 2);
        const y = (event.clientY - (box.top + box.height / 2)) / (box.height / 2);
        setOffset({
          x: Math.max(-1, Math.min(1, x)) * 6,
          y: Math.max(-1, Math.min(1, y)) * 6,
        });
      });
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  const shown = books.slice(0, PLACEMENTS.length);
  if (shown.length === 0) return null;

  return (
    <div ref={ref} className="hero-composition relative aspect-[7/5] w-full select-none">
      {/* The shelf the volumes stand on. */}
      <div
        className="absolute inset-x-[-6%] h-px bg-[var(--border-strong)] opacity-55"
        style={{ bottom: `${SHELF_FROM_BOTTOM}%` }}
      />
      <div
        className="absolute inset-x-[-6%] h-[3px] bg-[var(--border)] opacity-70"
        style={{ bottom: `calc(${SHELF_FROM_BOTTOM}% - 3px)` }}
      />

      {shown.map((book, index) => {
        const place = PLACEMENTS[index];
        return (
          <figure
            key={book.slug}
            className="hero-plane absolute m-0"
            style={{
              left: `${place.x}%`,
              bottom: `${SHELF_FROM_BOTTOM}%`,
              width: `${33 * place.scale}%`,
              transform: `translate3d(${offset.x * place.depth}px, ${
                offset.y * place.depth
              }px, 0) rotate(${place.rotate}deg)`,
              transformOrigin: "bottom center",
              animationDelay: `${index * 90}ms`,
              zIndex: Math.round(place.depth * 10),
            }}
          >
            <Link
              href={`/book/${book.slug}`}
              className="book-card group block no-underline focus-visible:outline-none"
              /* The composition is decorative in aggregate, but each cover is a real
                 link to a real book, so it needs a real name. */
              aria-label={`${book.title}${book.authors[0] ? ` by ${book.authors[0]}` : ""}`}
            >
              <BookCover
                coverKey={book.coverKey}
                title={book.title}
                authors={book.authors}
                size="medium"
                /* Above the fold on desktop, so the two largest load eagerly and the
                   rest wait. Four covers, not dozens. */
                priority={index < 2}
                decorative
                className="book-card-cover"
              />
            </Link>
          </figure>
        );
      })}
    </div>
  );
}
