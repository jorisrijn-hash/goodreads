import Link from "next/link";
import type { CSSProperties } from "react";
import { coverUrl } from "@/lib/api";

/**
 * A real cover, rendered as a physical book.
 *
 * The cover face carries a binding crease; a page block stands off its fore-edge with a
 * thickness taken from the real page count (a 400-page book is about a fifth as thick as
 * it is wide); a contact shadow puts it on a surface. `turn` rotates it on its spine, so
 * a row of books can face slightly different ways. Everything is CSS: no script, and it
 * looks the same before hydration as after.
 *
 * Needs an ancestor with `perspective` (see `.book-stage`) for the turn to read as depth.
 */
export function BookObject({
  slug,
  title,
  authors,
  coverKey,
  pageCount,
  width,
  ratio = 2 / 3,
  turn = 0,
  priority = false,
  sizes,
  className = "",
  style,
}: {
  slug: string;
  title: string;
  authors: string[];
  coverKey: string | null;
  pageCount: number | null;
  /** CSS length for the cover's width, e.g. "13rem" or "clamp(...)". */
  width: string;
  /** The cover's real width/height. */
  ratio?: number;
  /** Degrees around the spine. Negative shows the fore-edge on the right. */
  turn?: number;
  priority?: boolean;
  sizes: string;
  className?: string;
  style?: CSSProperties;
}) {
  // Pages to thickness, as a fraction of the cover width, kept within what reads as a book.
  const thickness = Math.min(0.3, Math.max(0.06, (pageCount ?? 320) * 0.00046));
  const srcSet = coverKey
    ? ([160, 320, 640] as const).map((w) => `${coverUrl(coverKey, w)} ${w}w`).join(", ")
    : undefined;

  return (
    <Link
      href={`/book/${slug}`}
      aria-label={`${title}${authors[0] ? ` by ${authors[0]}` : ""}`}
      className={`book-object ${className}`}
      style={{
        ["--w" as string]: width,
        ["--ratio" as string]: ratio,
        ["--thick" as string]: thickness,
        ["--turn" as string]: `${turn}deg`,
        ...style,
      }}
    >
      <span className="book-object__body">
        <span className="book-object__pages" aria-hidden="true" />
        {/* The spine: the cover's own left edge, turned to face sideways. On most jackets
            the spine continues the front's left-hand colour, so a book turned to show its
            spine still looks like itself. */}
        {coverKey && (
          <span className="book-object__spine" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element -- same cover file, already loaded */}
            <img src={coverUrl(coverKey, 320) ?? undefined} alt="" loading={priority ? "eager" : "lazy"} decoding="async" draggable={false} />
          </span>
        )}
        {coverKey ? (
          // eslint-disable-next-line @next/next/no-img-element -- covers are already-optimised derivatives; see BookCover
          <img
            className="book-object__cover"
            src={coverUrl(coverKey, 320) ?? undefined}
            srcSet={srcSet}
            sizes={sizes}
            alt=""
            width={320}
            height={Math.round(320 / ratio)}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            draggable={false}
          />
        ) : (
          <span className="book-object__cover book-object__cover--blank">{title}</span>
        )}
      </span>
    </Link>
  );
}
