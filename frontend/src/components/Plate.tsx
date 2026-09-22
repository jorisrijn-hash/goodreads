"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { plate, plateFile } from "@/content/photography";
import outputs from "@/content/plate-outputs.json";

type Outputs = Record<string, Record<string, { ratio: number; files: { width: number; height: number }[] }>>;
const OUTPUTS = outputs as Outputs;
const MOBILE = "(max-width: 767.98px)";

/**
 * A photograph placed as a layout object: a crop with a shape, a position in the grid,
 * and at most a slow reveal and a few pixels of parallax. Not a hero: no text on it, no
 * overlay, no slots.
 *
 * - `crop` / `mobileCrop`: named crops from the manifest (art direction via <picture>).
 * - `placement`: `contained` sits in its column; `bleed-left` / `bleed-right` run to the
 *   window's edge from a column that starts or ends at the page frame; `full` spans the
 *   window. Bleeds assume the page frame (see --plate-bleed), and the page should clip
 *   horizontal overflow.
 * - `reveal`: a clip that opens once, about 600ms, the first time it is seen. Without
 *   JavaScript or with reduced motion it is simply there.
 * - `parallax`: pixels of drift across the whole scroll range (0-24), CSS only, where
 *   the browser supports scroll-driven animation.
 * - `credit`: a visible line; the canonical credit is always the manifest, via the footer.
 *
 * The srcset is built from what the preparation script actually wrote, so a source too
 * small for a width simply has no file at that width, and is never shown enlarged.
 */
export function Plate({
  id,
  crop,
  mobileCrop,
  placement = "contained",
  sizes,
  mobileSizes = "100vw",
  reveal = true,
  parallax = 0,
  credit = false,
  priority = false,
  decorative = false,
  className = "",
}: {
  id: string;
  crop: string;
  mobileCrop?: string;
  placement?: "contained" | "bleed-left" | "bleed-right" | "full";
  sizes: string;
  mobileSizes?: string;
  reveal?: boolean;
  parallax?: number;
  credit?: boolean;
  priority?: boolean;
  decorative?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(!reveal || priority);
  useEffect(() => {
    if (shown || !ref.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setShown(true);
        observer.disconnect();
      }
    }, { threshold: 0.2, rootMargin: "100000px 0px 0px 0px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [shown]);

  const entry = plate(id);
  const main = OUTPUTS[id]?.[crop];
  const mobile = mobileCrop ? OUTPUTS[id]?.[mobileCrop] : undefined;
  if (!main || main.files.length === 0) throw new Error(`Plate "${id}" has no prepared "${crop}" crop; run scripts/prepare-photos.mjs --plates`);

  const set = (name: string, files: { width: number }[], format: "avif" | "webp") =>
    files.map((f) => `${plateFile(id, name, f.width, format)} ${f.width}w`).join(", ");
  const smallest = main.files[0];

  const style = {
    "--plate-ratio": main.ratio,
    "--plate-ratio-m": mobile?.ratio ?? main.ratio,
    "--plate-drift": `${Math.max(0, Math.min(24, parallax))}px`,
  } as CSSProperties;

  return (
    <figure
      ref={ref}
      className={`plate plate--${placement} ${className}`}
      data-plate-reveal={reveal && !priority ? "" : undefined}
      data-shown={shown ? "" : undefined}
      data-parallax={parallax > 0 ? "" : undefined}
      style={style}
    >
      <div className="plate__frame">
        <picture>
          {mobile && mobileCrop && <source type="image/avif" media={MOBILE} srcSet={set(mobileCrop, mobile.files, "avif")} sizes={mobileSizes} />}
          {mobile && mobileCrop && <source type="image/webp" media={MOBILE} srcSet={set(mobileCrop, mobile.files, "webp")} sizes={mobileSizes} />}
          <source type="image/avif" srcSet={set(crop, main.files, "avif")} sizes={sizes} />
          <source type="image/webp" srcSet={set(crop, main.files, "webp")} sizes={sizes} />
          <img
            src={plateFile(id, crop, smallest.width, "webp")}
            alt={decorative ? "" : entry.alt}
            width={smallest.width}
            height={smallest.height}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            className="plate__img"
          />
        </picture>
      </div>
      {credit && (
        <figcaption className="plate__credit">
          Photograph: <a href={entry.sourceUrl}>{entry.photographer}</a> ({entry.licence})
        </figcaption>
      )}
    </figure>
  );
}
