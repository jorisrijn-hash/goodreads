import Link from "next/link";
import type { CSSProperties } from "react";
import { coverUrl } from "@/lib/api";

const EMPTY_IMAGE = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * A real cover, shown as what it is: a printed jacket.
 *
 * No extruded spine, no page block. Its presence comes from a contact shadow that sits
 * it on the page, a soft fall-off below, a hairline edge, and a faint sheen across the
 * printed surface. Any rotation is a few degrees at most, the way a book lands when put
 * down by hand.
 */
export function CoverPrint({
  slug,
  title,
  authors,
  coverKey,
  width,
  ratio = 2 / 3,
  rotate = 0,
  priority = false,
  sizes,
  media,
  className = "",
  style,
}: {
  slug: string;
  title: string;
  authors: string[];
  coverKey: string | null;
  /** CSS length for the cover's width. */
  width: string;
  /** The cover's real width/height. */
  ratio?: number;
  /** Degrees; keep within ±3. */
  rotate?: number;
  priority?: boolean;
  sizes: string;
  /** Only fetch the cover where this media query matches (a layout that hides it fetches nothing). */
  media?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const srcSet = coverKey
    ? ([160, 320, 640] as const).map((w) => `${coverUrl(coverKey, w)} ${w}w`).join(", ")
    : undefined;

  return (
    <Link
      href={`/book/${slug}`}
      aria-label={`${title}${authors[0] ? ` by ${authors[0]}` : ""}`}
      className={`cover-print ${className}`}
      style={{ ["--w" as string]: width, ["--ratio" as string]: ratio, ["--rot" as string]: `${rotate}deg`, ...style }}
    >
      {coverKey ? (
        <picture className="contents">
          {media && <source media={media} srcSet={srcSet} sizes={sizes} />}
          <img
            src={media ? EMPTY_IMAGE : (coverUrl(coverKey, 320) ?? undefined)}
            srcSet={media ? undefined : srcSet}
            sizes={sizes}
            alt=""
            width={320}
            height={Math.round(320 / ratio)}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            draggable={false}
          />
        </picture>
      ) : (
        <span className="cover-print__blank">{title}</span>
      )}
    </Link>
  );
}
