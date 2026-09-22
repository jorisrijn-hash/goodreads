/**
 * High-resolution covers for the landing page's large scenes.
 *
 * The catalogue stores Open Library's capped "-L" size (about 320px wide), which is
 * right for grids and far too soft for a book shown 250px wide on a high-density screen.
 * For the few books the landing page shows large, scripts/prepare-landing-covers.mjs
 * fetches the full-resolution original of a real cover from Open Library and derives
 * sharp display sizes. Nothing is redrawn or colour graded.
 *
 * `source` says which cover it is:
 *   - "catalogue": the catalogue record's own cover, at full resolution
 *   - "edition":   a cover scan of another edition of the same work on Open Library,
 *                  used where the catalogue's own cover exists only at low resolution
 *
 * Each book still links to its catalogue record.
 */
export type LandingCover = {
  slug: string;
  /** Open Library cover id the files were derived from. */
  coverId: number;
  source: "catalogue" | "edition";
  /** Width / height of the original scan. */
  ratio: number;
  /** Widths prepared under /covers-hq/{slug}-{width}.{avif,webp}. */
  widths: number[];
};

export const LANDING_COVERS: LandingCover[] = [
  { slug: "dune-ol893414w", coverId: 6978883, source: "edition", ratio: 2633 / 4490, widths: [320, 560, 840] },
  { slug: "the-secret-history-ol4321141w", coverId: 6952968, source: "edition", ratio: 2683 / 4152, widths: [320, 560, 840] },
  { slug: "never-let-me-go-ol59038w", coverId: 11685000, source: "edition", ratio: 1734 / 2734, widths: [320, 560, 840] },
  { slug: "nineteen-eighty-four-ol1168083w", coverId: 14416004, source: "edition", ratio: 1226 / 1959, widths: [320, 560, 840] },
  { slug: "tomorrow-and-tomorrow-and-tomorrow-ol26004554w", coverId: 12859975, source: "catalogue", ratio: 1696 / 2560, widths: [320, 560, 840] },
  { slug: "educated-ol18139176w", coverId: 8314077, source: "catalogue", ratio: 1000 / 1519, widths: [320, 560, 840] },
  { slug: "normal-people-ol20150260w", coverId: 15213474, source: "edition", ratio: 1080 / 1726, widths: [320, 560, 840] },
  { slug: "middlemarch-ol20867w", coverId: 6947969, source: "edition", ratio: 2603 / 4461, widths: [320, 560, 840] },
  { slug: "jane-eyre-ol1095427w", coverId: 6519400, source: "edition", ratio: 2163 / 3527, widths: [320, 560, 840] },
];

export function landingCover(slug: string): LandingCover | undefined {
  return LANDING_COVERS.find((c) => c.slug === slug);
}
