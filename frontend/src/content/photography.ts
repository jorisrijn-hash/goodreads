/**
 * Every photograph the product shows, and who made it.
 *
 * The single source for both the image and its credit: a component takes its image
 * from here, and the footer lists everything here, so a photo cannot appear without its
 * credit. Replacing a photo — with your own, say — means changing one entry.
 *
 * Files are self-hosted under /public/photography as AVIF with a WebP fallback; nothing
 * is loaded from Unsplash at runtime.
 */
export type Photograph = {
  /** Stable id components refer to. */
  id: string;
  /** Path under /public, without extension; .avif and .webp must both exist. */
  src: string;
  width: number;
  height: number;
  /** Describes what is in the picture, for readers who cannot see it. */
  alt: string;
  photographer: string;
  /** The photo's own page, which carries its licence. */
  sourceUrl: string;
  licence: "Unsplash License" | "Own work";
};

export const PHOTOGRAPHS: Photograph[] = [];

export function photograph(id: string): Photograph {
  const found = PHOTOGRAPHS.find((photo) => photo.id === id);
  if (!found) throw new Error(`Unknown photograph "${id}" — add it to src/content/photography.ts`);
  return found;
}
