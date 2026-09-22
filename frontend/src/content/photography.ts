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

// ---------------------------------------------------------------------------- plates --
//
// Plates are the photographs placed as layout objects (see components/Plate.tsx). Unlike
// the entries above, each plate is one source photograph with named crops described by
// intent: a ratio and a focal point. scripts/prepare-photos.mjs reads this list, cuts
// each crop from the source, grades it and writes AVIF and WebP at the listed widths
// (never wider than the crop itself) to /photography/{id}-{crop}-{width}.{avif,webp}.
//
// Replacing a plate's photograph, for example with your own, is: put the new file in
// .photo-cache/, change `source`, `native`, the credit and (if needed) the focal points
// here, and run the script. No component or layout changes.

export type PhotoCategory =
  | "tactile"
  | "still-life"
  | "human-interaction"
  | "light-shadow"
  | "environment"
  | "product-in-world";

export type PlateSource =
  /** Fetched through Unsplash's download endpoint, which is also how it asks to be credited. */
  | { kind: "unsplash"; id: string }
  /** A file placed in .photo-cache/ (never committed): your own work, or another licence. */
  | { kind: "file"; file: string };

export type PlateCrop = {
  /** Width / height. */
  ratio: number;
  /** The point (0..1 of the source) that must stay in frame. */
  focal: { x: number; y: number };
  /** 1 (default) = the largest window of this ratio; less = tighter on the focal point. */
  scale?: number;
  /** Output widths; the script skips any wider than the crop itself. */
  widths: number[];
};

export type PlateEntry = {
  id: string;
  /** What is in the picture, for readers who cannot see it. Plates may still be shown decoratively. */
  alt: string;
  category: PhotoCategory;
  source: PlateSource;
  /** Size of the source file, so crops can be checked before anything is cut. */
  native: { width: number; height: number };
  photographer: string;
  sourceUrl: string;
  licence: "Unsplash License" | "Own work" | "Pexels License" | "AI-generated (disclosed)";
  /** "world": the shared atmospheric grade. "natural": a lighter one for skin and paper
   *  (cream highlights, deeper neutral shadows, colour kept). "none": as shot. */
  grade: "world" | "natural" | "none";
  crops: Record<string, PlateCrop>;
};

/** Empty until a photograph is approved; nothing renders a plate that is not listed. */
export const PLATES: PlateEntry[] = [
  {
    // Book Detail's one photograph, until it can be replaced with our own shot of the same
    // moment (hands turning a page on stone, window light): see the note above.
    id: "page-turn",
    alt: "Two hands turning the pages of a small hardback book, in soft daylight",
    category: "human-interaction",
    source: { kind: "unsplash", id: "QgCNcHLpPok" },
    native: { width: 6000, height: 4000 },
    photographer: "Jessica Da Rosa",
    sourceUrl: "https://unsplash.com/photos/QgCNcHLpPok",
    licence: "Unsplash License",
    grade: "natural",
    crops: {
      // Both hands and the turning page, starting just under the necklace cords.
      wide: { ratio: 1.6, focal: { x: 0.49, y: 0.6 }, scale: 0.72, widths: [800, 1280, 1920, 2560] },
      // Phones: the fingers and the page being turned, closer in.
      tall: { ratio: 0.8, focal: { x: 0.5, y: 0.63 }, scale: 0.74, widths: [600, 900, 1200] },
    },
  },
];

export function plate(id: string): PlateEntry {
  const found = PLATES.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown plate "${id}"; add it to PLATES in src/content/photography.ts`);
  return found;
}

export function plateFile(id: string, crop: string, width: number, format: "avif" | "webp"): string {
  return `/photography/${id}-${crop}-${width}.${format}`;
}

/**
 * Everyone to credit, once each: the photographs above and the plates. The footer lists
 * this, so a photograph cannot appear on the site without its credit.
 */
export function credits(): { key: string; photographer: string; sourceUrl: string; licence: string }[] {
  const all = [
    ...PHOTOGRAPHS.map((p) => ({ key: p.id, photographer: p.photographer, sourceUrl: p.sourceUrl, licence: p.licence as string })),
    ...PLATES.map((p) => ({ key: p.id, photographer: p.photographer, sourceUrl: p.sourceUrl, licence: p.licence as string })),
  ];
  return all.filter((c, i) => all.findIndex((d) => d.photographer === c.photographer) === i);
}
