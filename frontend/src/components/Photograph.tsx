import { photograph } from "@/content/photography";

/** A 1×1 transparent GIF: the source for layouts a media-gated photo is not shown in. */
const EMPTY = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * A self-hosted photograph: AVIF where the browser supports it, WebP otherwise, at the
 * widths prepared for it. The box reserves its aspect ratio before the file arrives.
 */
export function Photograph({
  id,
  sizes,
  priority = false,
  decorative = false,
  media,
  className = "",
  imgClassName = "",
}: {
  id: string;
  sizes: string;
  /** Only for a photograph that is visible on load. */
  priority?: boolean;
  /** A backdrop that carries no information of its own: empty alt, so it is skipped. */
  decorative?: boolean;
  /** Only fetch where this media query matches — for a photo that one layout hides.
   *  Elsewhere the <img> falls back to an empty source and nothing is downloaded. */
  media?: string;
  className?: string;
  imgClassName?: string;
}) {
  const photo = photograph(id);
  const set = (format: "avif" | "webp") =>
    photo.widths.map((w) => `/photography/${photo.id}-${w}.${format} ${w}w`).join(", ");
  const smallest = photo.widths[0];

  return (
    <picture className={className}>
      <source type="image/avif" srcSet={set("avif")} sizes={sizes} media={media} />
      <source type="image/webp" srcSet={set("webp")} sizes={sizes} media={media} />
      <img
        src={media ? EMPTY : `/photography/${photo.id}-${smallest}.webp`}
        alt={decorative ? "" : photo.alt}
        width={smallest}
        height={Math.round(smallest / photo.ratio)}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={imgClassName}
      />
    </picture>
  );
}
