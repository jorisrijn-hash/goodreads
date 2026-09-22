"use client";

import { useCallback, useState } from "react";
import { coverUrl } from "@/lib/api";

/**
 * A real, flat cover with a contact shadow, for Home's compositions.
 *
 * Open Library sources are small (most about 320px wide), so once the file has loaded its
 * true pixel width is measured and the cover is never drawn wider than that: a weak
 * source stays a believable size rather than being stretched to fill the layout. Its own
 * proportions are kept, not cropped to 2:3. Without JavaScript it keeps the layout size.
 *
 * The measured values use their own names (--cover-cap, --cover-ar): the pointer-depth
 * wrapper around the featured cover already sets --px and --py.
 */
export function HomeCover({
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
      // A fresh Image without srcset reports the file's true size (from cache).
      const probe = new Image();
      probe.src = img.currentSrc || img.src;
      probe.decode().then(() => {
        const frame = img.parentElement;
        if (!frame || !probe.naturalWidth) return;
        frame.style.setProperty("--cover-ar", String(probe.naturalHeight / probe.naturalWidth));
        frame.style.setProperty("--cover-cap", `${probe.naturalWidth}px`);
      }, () => {});
    };
    if (img.complete && img.naturalWidth) fit();
    else img.addEventListener("load", fit, { once: true });
  }, []);

  if (!coverKey || failed) {
    return (
      <span aria-hidden="true" className={`home-cover home-cover--blank ${className}`}>
        <span className="line-clamp-4 font-serif text-[1rem] leading-tight">{title}</span>
        {author && <span className="type-label mt-auto line-clamp-2 text-[0.5625rem]">{author}</span>}
      </span>
    );
  }

  return (
    <span className={`home-cover ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- covers are already-optimised derivatives; see BookCover */}
      <img
        ref={measure}
        src={coverUrl(coverKey, 320)!}
        srcSet={([160, 320, 640] as const).map((w) => `${coverUrl(coverKey, w)} ${w}w`).join(", ")}
        sizes={sizes}
        // A 2:3 box until the real proportions are known, so nothing grows from nothing.
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
