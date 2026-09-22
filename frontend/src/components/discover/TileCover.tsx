"use client";

import { useCallback, useState } from "react";
import { coverUrl } from "@/lib/api";

/**
 * A cover standing on a display tile.
 *
 * Unlike BookCover this keeps the cover's own proportions rather than cropping it to 2:3:
 * on a neutral display surface a cover is an object, and a slightly wider or taller one
 * should look it. The tile around it has a fixed shape, so nothing shifts as it loads.
 *
 * Always decorative: the tile names the book right below.
 *
 * Open Library covers are small (most sources are about 320px wide and some under 150px),
 * and the ingest never upscales them. So once a cover has loaded, its real pixel width
 * and proportions are measured and the cover is never shown larger than 1:1, and a very
 * tall one is narrowed to fit its tile. Without JavaScript it simply keeps the default
 * size.
 */
export function TileCover({
  coverKey,
  title,
  author,
  sizes,
  priority = false,
  className = "",
}: {
  coverKey: string | null;
  title: string;
  author?: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const measure = useCallback((img: HTMLImageElement | null) => {
    if (!img) return;
    const fit = () => {
      // A fresh Image without srcset reports the file's true pixel size (from cache).
      const probe = new Image();
      probe.src = img.currentSrc || img.src;
      probe.decode().then(() => {
        const frame = img.parentElement;
        if (!frame || !probe.naturalWidth) return;
        frame.style.setProperty("--ar", String(probe.naturalHeight / probe.naturalWidth));
        frame.style.setProperty("--px", `${probe.naturalWidth}px`);
      }, () => {});
    };
    if (img.complete && img.naturalWidth) fit();
    else img.addEventListener("load", fit, { once: true });
  }, []);

  if (!coverKey || failed) {
    // A typographic stand-in, shaped like a book, rather than a broken image.
    return (
      <span aria-hidden="true" className={`tile-cover tile-cover--blank ${className}`}>
        <span className="line-clamp-4 font-serif text-[0.9375rem] leading-tight">{title}</span>
        {author && <span className="type-label mt-auto line-clamp-2 text-[0.5625rem]">{author}</span>}
      </span>
    );
  }

  return (
    <span className={`tile-cover ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- covers are already-optimised derivatives; see BookCover */}
      <img
        ref={measure}
        src={coverUrl(coverKey, 320)!}
        srcSet={([160, 320, 640] as const).map((w) => `${coverUrl(coverKey, w)} ${w}w`).join(", ")}
        sizes={sizes}
        // Reserves a 2:3 box before the file arrives (height: auto uses this ratio until
        // the real one is known), so a cover does not grow from nothing as it loads.
        width={320}
        height={480}
        alt=""
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
