/**
 * Every photograph the product shows, and who made it.
 *
 * The single source for both the image and its credit: components take their image from
 * here, and the footer lists everything here, so a photo cannot appear without its
 * credit. Replacing a photo — with your own, say — means changing one entry and
 * re-running scripts/prepare-photos.mjs.
 *
 * Files are self-hosted under /public/photography as AVIF with a WebP fallback, at the
 * listed widths; nothing is loaded from Unsplash at runtime.
 */
export type Photograph = {
  /** Stable id; files are /photography/{id}-{width}.{avif,webp}. */
  id: string;
  widths: number[];
  /** Width / height of the prepared crop. */
  ratio: number;
  /** Describes what is in the picture, for readers who cannot see it. */
  alt: string;
  /** Shown beside the image where it is captioned; verified from the photo's page. */
  caption?: string;
  photographer: string;
  /** The photo's own page, which carries its licence. */
  sourceUrl: string;
  licence: "Unsplash License" | "Own work";
};

export const PHOTOGRAPHS: Photograph[] = [
  {
    id: "wall-light",
    widths: [800, 1400],
    ratio: 1,
    alt: "Afternoon sunlight and the shadows of leaves falling across a warm plaster wall",
    photographer: "Sreeraj S",
    sourceUrl: "https://unsplash.com/photos/95baBTvQ5gI",
    licence: "Unsplash License",
  },
  {
    id: "old-library",
    widths: [640, 1100],
    ratio: 0.75,
    alt: "A long library hall under a timber barrel vault, with two storeys of wooden shelves",
    caption: "The Old Library, Trinity College Dublin",
    photographer: "Michaela Murphy",
    sourceUrl: "https://unsplash.com/photos/TIS8AnSiFI4",
    licence: "Unsplash License",
  },
];

export function photograph(id: string): Photograph {
  const found = PHOTOGRAPHS.find((photo) => photo.id === id);
  if (!found) throw new Error(`Unknown photograph "${id}" — add it to src/content/photography.ts`);
  return found;
}
