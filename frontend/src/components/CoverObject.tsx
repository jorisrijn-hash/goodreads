"use client";

import { useCallback, useState, type CSSProperties } from "react";
import { landingCover } from "@/content/landing-covers";
import { coverUrl } from "@/lib/api";

/**
 * A book cover as an object, for Book Detail and the Library.
 *
 * - Its own proportions: never cropped to 2:3.
 * - Drawn only as large as its file can keep sharp. Catalogue covers are mostly ~320px
 *   wide; once one has loaded its real pixel width is measured, and the cover is capped
 *   at that width divided by the screen's density (up to `density`, 1.6 by default). A
 *   320px file therefore shows at about 200 CSS px on a 2x screen, not 300: visibly sharp,
 *   and the field around it, not an enlarged cover, gives it presence.
 * - Where a full-resolution scan exists (content/landing-covers.ts) it is used instead,
 *   with its ratio known in advance, in the same template.
 * - A contact shadow and nothing else: no page block, no spine, no 3D.
 *
 * The field around it is sized by the caller (a width, and a ratio or height). The cover
 * takes `--cover-fill` of the field's width, less if it is tall or small, and sits
 * centred or on the field's baseline. `surface` paints the field as a neutral display.
 */
export function CoverObject({
  book,
  sizes,
  surface = false,
  align = "center",
  fill = 0.62,
  density = 1.6,
  priority = false,
  decorative = true,
  className = "",
  style,
}: {
  book: { slug: string; title: string; authors: string[]; coverKey: string | null };
  sizes: string;
  surface?: boolean;
  align?: "center" | "bottom";
  /** Share of the field's width the cover may take (0-1). */
  fill?: number;
  /** Device pixels each CSS pixel should get, at most (a 1x screen needs only 1). */
  density?: number;
  priority?: boolean;
  /** True where the title is written beside it (the usual case): empty alt. */
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  const [measured, setMeasured] = useState<{ ratio: number; width: number } | null>(null);
  const hq = landingCover(book.slug);

  const measure = useCallback((img: HTMLImageElement | null) => {
    if (!img || hq) return;
    const fit = () => {
      // A fresh Image without srcset reports the file's true size (from cache).
      const probe = new Image();
      probe.src = img.currentSrc || img.src;
      probe.decode().then(() => {
        if (!probe.naturalWidth) return;
        const effective = Math.max(1, Math.min(density, window.devicePixelRatio || 1));
        setMeasured({ ratio: probe.naturalHeight / probe.naturalWidth, width: Math.floor(probe.naturalWidth / effective) });
      }, () => {});
    };
    if (img.complete && img.naturalWidth) fit();
    else img.addEventListener("load", fit, { once: true });
  }, [hq, density]);

  const alt = decorative ? "" : `${book.title}${book.authors.length ? ` by ${book.authors.join(", ")}` : ""}`;
  const ratio = hq ? 1 / hq.ratio : measured?.ratio;
  const vars = {
    "--cover-fill": fill,
    ...(ratio ? { "--cover-ar": ratio } : {}),
    ...(!hq && measured ? { "--cover-cap": `${measured.width}px` } : {}),
    ...style,
  } as CSSProperties;

  let image;
  if (hq) {
    const set = (format: "avif" | "webp") => hq.widths.map((w) => `/covers-hq/${book.slug}-${w}.${format} ${w}w`).join(", ");
    image = (
      <picture>
        <source type="image/avif" srcSet={set("avif")} sizes={sizes} />
        <img
          src={`/covers-hq/${book.slug}-320.webp`}
          srcSet={set("webp")}
          sizes={sizes}
          alt={alt}
          width={320}
          height={Math.round(320 / hq.ratio)}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
        />
      </picture>
    );
  } else if (book.coverKey && !failed) {
    image = (
      // eslint-disable-next-line @next/next/no-img-element -- covers are already-optimised derivatives; see BookCover
      <img
        ref={measure}
        src={coverUrl(book.coverKey, 320)!}
        srcSet={([160, 320, 640] as const).map((w) => `${coverUrl(book.coverKey, w)} ${w}w`).join(", ")}
        sizes={sizes}
        alt={alt}
        // A 2:3 box until the real proportions are known, so nothing grows from nothing.
        width={320}
        height={480}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  } else {
    // No cover, or it failed: a typographic stand-in that still names the book.
    image = (
      <span className="cover-object__blank" role={decorative ? undefined : "img"} aria-label={decorative ? undefined : alt} aria-hidden={decorative || undefined}>
        <span className="line-clamp-4 font-serif text-[1rem] leading-tight">{book.title}</span>
        {book.authors[0] && <span className="type-label mt-auto line-clamp-2 text-[0.5625rem]">{book.authors[0]}</span>}
      </span>
    );
  }

  return (
    <div className={`cover-object ${className}`} data-surface-display={surface || undefined} data-align={align} style={vars}>
      <span className="cover-object__book">{image}</span>
    </div>
  );
}
