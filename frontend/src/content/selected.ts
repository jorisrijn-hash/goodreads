/**
 * SELECTED — an explicit, editorial choice of real catalogue books.
 *
 * Used only where the product shows books as imagery: the landing composition and the
 * scenes beneath it. Everywhere a reader browses or searches, the catalogue speaks for
 * itself. Picking these by hand is honest because the page labels them as a selection;
 * letting an arbitrary query pick the hero images is how a SparkNotes cover ends up as
 * the first thing a visitor sees (docs/backlog/0001-catalogue-quality.md).
 *
 * Every slug must exist in the catalogue. The page fetches each one, so a missing book
 * simply does not appear — nothing here is rendered from this file alone.
 *
 * `ratio` is the cover's real width/height, measured from the stored derivative, so the
 * physical book reserves exactly the space its cover needs (no layout shift, no crop).
 */
export type SelectedBook = { slug: string; ratio: number };

export const HERO_BOOKS: SelectedBook[] = [
  { slug: "klara-and-the-sun-ol20883297w", ratio: 0.65 },
  { slug: "beloved-ol50548w", ratio: 0.668 },
  { slug: "the-secret-history-ol4321141w", ratio: 0.648 },
  { slug: "circe-ol18012166w", ratio: 0.663 },
  { slug: "dune-ol893414w", ratio: 0.634 },
  { slug: "project-hail-mary-ol21745884w", ratio: 0.65 },
  // Its stored cover is only 149px wide, so it stands small and in front, never large.
  { slug: "the-creative-act-ol27955361w", ratio: 0.683 },
];

/** The phone composition: three books, chosen to read at small sizes. */
export const HERO_BOOKS_MOBILE = [
  "the-secret-history-ol4321141w",
  "circe-ol18012166w",
  "dune-ol893414w",
];

/** Books for the illustrated library scene: an example, and captioned as one. */
export const EXAMPLE_LIBRARY = [
  { slug: "dune-ol893414w", status: "CURRENTLY_READING" },
  { slug: "the-secret-history-ol4321141w", status: "WANT_TO_READ" },
  { slug: "klara-and-the-sun-ol20883297w", status: "WANT_TO_READ" },
  { slug: "beloved-ol50548w", status: "READ" },
] as const;

/** A misspelled query that the real search corrects to several real books. */
export const TYPO_EXAMPLE = "madeline miler";
