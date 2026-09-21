/**
 * SELECTED: an explicit, editorial choice of real catalogue books.
 *
 * Used only where the product shows books as imagery: the landing collage and the
 * scenes beneath it. Everywhere a reader browses or searches, the catalogue speaks for
 * itself. Picking these by hand is honest because the page labels them as a selection;
 * letting an arbitrary query pick the hero images is how a SparkNotes cover ends up as
 * the first thing a visitor sees (docs/backlog/0001-catalogue-quality.md).
 *
 * Every slug must exist in the catalogue. The page fetches each one, so a missing book
 * simply does not appear; nothing here is rendered from this file alone.
 */

/**
 * Each cover's real width/height, measured from the stored derivative, so a cover
 * reserves exactly the space it needs: no layout shift, no crop.
 */
export const COVER_RATIO: Record<string, number> = {
  "circe-ol18012166w": 0.663,
  "klara-and-the-sun-ol20883297w": 0.65,
  "normal-people-ol20150260w": 0.662,
  "project-hail-mary-ol21745884w": 0.65,
  "piranesi-ol20893680w": 0.706,
  // Its stored cover is only 149px wide, so it is always shown small.
  "the-creative-act-ol27955361w": 0.683,
  "dune-ol893414w": 0.634,
  "the-secret-history-ol4321141w": 0.648,
  "crying-in-h-mart-ol22448002w": 0.676,
  "the-song-of-achilles-ol16509148w": 0.675,
  "the-bell-jar-ol1865528w": 0.624,
  "the-remains-of-the-day-ol59048w": 0.623,
  "beloved-ol50548w": 0.668,
};

/** The hero collage, back to front. */
export const HERO_BOOKS = [
  "piranesi-ol20893680w",
  "normal-people-ol20150260w",
  "klara-and-the-sun-ol20883297w",
  "project-hail-mary-ol21745884w",
  "circe-ol18012166w",
  "the-creative-act-ol27955361w",
];

/** The phone collage: four, chosen to read at small sizes. */
export const HERO_BOOKS_MOBILE = [
  "klara-and-the-sun-ol20883297w",
  "normal-people-ol20150260w",
  "circe-ol18012166w",
  "project-hail-mary-ol21745884w",
];

/**
 * The illustrated library: an example, captioned as one. One book in each reading
 * state, plus a second Want to Read, so every state the product has is shown.
 */
export const EXAMPLE_LIBRARY = [
  { slug: "dune-ol893414w", status: "CURRENTLY_READING" },
  { slug: "the-secret-history-ol4321141w", status: "WANT_TO_READ" },
  { slug: "crying-in-h-mart-ol22448002w", status: "WANT_TO_READ" },
  { slug: "the-song-of-achilles-ol16509148w", status: "READ" },
  { slug: "the-bell-jar-ol1865528w", status: "DNF" },
] as const;

/** The small shelf beside the closing call to action. */
export const CLOSING_SHELF = [
  "the-remains-of-the-day-ol59048w",
  "beloved-ol50548w",
  "circe-ol18012166w",
  "dune-ol893414w",
];

/**
 * A misspelled query that the real search corrects to several real books. Chosen, like
 * the books above, for what it shows: "madeline miler" is also corrected correctly, but
 * its answer includes a Spanish edition (see the backlog), and the landing page should
 * show the catalogue at its clearest rather than hide the record.
 */
export const TYPO_EXAMPLE = "toni morison";

/** The misspelled author the how-it-works scene searches for; the real API answers it. */
export const HOW_IT_WORKS_QUERY = "frank herbrt";

/** Every slug the landing page needs, fetched once each. */
export const LANDING_SLUGS = [...new Set([
  ...HERO_BOOKS, ...HERO_BOOKS_MOBILE, ...EXAMPLE_LIBRARY.map((e) => e.slug), ...CLOSING_SHELF,
])];
