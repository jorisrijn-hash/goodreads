"use client";

import { useState } from "react";
import { coverUrl } from "@/lib/api";

/** The widths the ingest generates. There are no others. */
const SIZES = {
  small: { width: 160, sizes: "160px" },
  medium: { width: 320, sizes: "(max-width: 640px) 45vw, 220px" },
  large: { width: 640, sizes: "(max-width: 1024px) 60vw, 440px" },
} as const;

type Props = {
  coverKey: string | null;
  title: string;
  authors?: string[];
  size?: keyof typeof SIZES;
  /** Set on the one cover above the fold; everything else stays lazy. */
  priority?: boolean;
  /** True when adjacent text already names the book, so the image is decorative. */
  decorative?: boolean;
  className?: string;
};

/**
 * A book cover.
 *
 * <p>Covers are the main source of colour in this interface, so this is a real component:
 * a 2:3 box that reserves its space before the image arrives (no layout shift), a
 * typographic fallback rather than a broken-image icon, and alt text that depends on
 * context.
 *
 * <p>A plain {@code <img>} with a srcset, deliberately, rather than next/image. The
 * ingest already produced exactly the three widths used here, stored immutably and served
 * with a one-year cache — running them through an optimiser would re-encode images that
 * are already optimised, add a hop on every request, and consume image-optimisation quota
 * to produce the file we started with. It also avoids Next's (correct) refusal to fetch
 * from a local address in development.
 *
 * <p>Alt text: when the title and author are already rendered beside the cover the image
 * is decorative and gets an empty alt, or a screen reader announces the same book twice.
 * When the cover is the only content of a link, it carries the full name.
 */
export function BookCover({
  coverKey, title, authors = [], size = "medium",
  priority = false, decorative = false, className = "",
}: Props) {
  const [failed, setFailed] = useState(false);
  const config = SIZES[size];
  const src = coverUrl(coverKey, config.width);

  // Offer every width we actually have; the browser picks by viewport and DPR.
  const srcSet = coverKey
    ? ([160, 320, 640] as const)
        .map(width => `${coverUrl(coverKey, width)} ${width}w`)
        .join(", ")
    : undefined;

  const alt = decorative
    ? ""
    : authors.length > 0
      ? `${title} by ${authors.join(", ")}`
      : title;

  return (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden bg-[var(--paper)] ${className}`}
      style={{ boxShadow: "0 8px 24px -16px rgba(25, 24, 21, 0.5)" }}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- covers are already-optimised derivatives; see BookCover
        <img
          src={src}
          srcSet={srcSet}
          sizes={config.sizes}
          alt={alt}
          /* The box already reserves the space, but width/height keeps the intrinsic
             ratio correct if CSS has not applied yet. */
          width={config.width}
          height={Math.round(config.width * 1.5)}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        /*
          No cover, or it failed. A typographic stand-in that still says which book this
          is, rather than a broken-image icon.
        */
        <div
          className="flex h-full w-full flex-col justify-between border border-[var(--border-strong)]
                     bg-[var(--paper)] p-[var(--space-3)]"
          aria-hidden={decorative || undefined}
          role={decorative ? undefined : "img"}
          aria-label={decorative ? undefined : alt}
        >
          <span className="absolute inset-y-0 left-0 w-[7%] bg-[var(--border)]" />
          <span className="ml-[10%] font-serif text-sm leading-tight text-[var(--ink)] line-clamp-4">
            {title}
          </span>
          {authors.length > 0 && (
            <span className="ml-[10%] text-[0.65rem] uppercase tracking-[0.12em] text-[var(--ink-60)] line-clamp-2">
              {authors[0]}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
