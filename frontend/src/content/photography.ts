/**
 * Every photograph the product shows, and who made it.
 *
 * The single source for both the image and its credit: components take their image from
 * here, and the footer lists everything here (one credit per photograph, however many
 * crops of it are used), so a photo cannot appear without its credit. Replacing a photo
 * with your own means changing one entry and re-running scripts/prepare-photos.mjs.
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

const OLD_LIBRARY = {
  caption: "The Old Library, Trinity College Dublin",
  photographer: "Michaela Murphy",
  sourceUrl: "https://unsplash.com/photos/TIS8AnSiFI4",
  licence: "Unsplash License",
} as const;

export const PHOTOGRAPHS: Photograph[] = [
  {
    id: "library-bust",
    widths: [900, 1400, 1900],
    ratio: 0.9,
    alt: "A marble bust in a ruffled collar in front of shelves of old leather-bound books",
    ...OLD_LIBRARY,
    sourceUrl: "https://unsplash.com/photos/X4Xgm-kWpYY",
  },
  {
    // The same photograph, cropped tall for phones.
    id: "library-bust-tall",
    widths: [600, 900],
    ratio: 0.539,
    alt: "A marble bust in a ruffled collar in front of shelves of old leather-bound books",
    ...OLD_LIBRARY,
    sourceUrl: "https://unsplash.com/photos/X4Xgm-kWpYY",
  },
  {
    id: "library-vault",
    widths: [360, 600],
    ratio: 0.646,
    alt: "The timber barrel vault of a long library hall, above shelves of old books",
    ...OLD_LIBRARY,
  },
  {
    id: "leaf-pair",
    widths: [400, 800],
    ratio: 0.832,
    alt: "",
    photographer: "Mockup Graphics",
    sourceUrl: "https://unsplash.com/photos/_mUVHhvBYZ0",
    licence: "Unsplash License",
  },
];

export function photograph(id: string): Photograph {
  const found = PHOTOGRAPHS.find((photo) => photo.id === id);
  if (!found) throw new Error(`Unknown photograph "${id}"; add it to src/content/photography.ts`);
  return found;
}
