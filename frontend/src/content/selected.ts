/**
 * SELECTED: an explicit, editorial choice of real catalogue books.
 *
 * Used only where the landing page shows books as imagery. Everywhere a reader browses or
 * searches, the catalogue speaks for itself. Picking these by hand is honest because the
 * page labels them as a selection; letting an arbitrary query pick the hero images is how
 * a SparkNotes cover ends up as the first thing a visitor sees (see the backlog).
 *
 * Every slug must exist in the catalogue. The page fetches each one, so a missing book
 * simply does not appear; nothing here is rendered from this file alone.
 */

/** Each cover's real width/height, measured from the stored derivative (no shift, no crop). */
export const COVER_RATIO: Record<string, number> = {
  "dune-ol893414w": 0.634,
  "the-secret-history-ol4321141w": 0.648,
  "circe-ol18012166w": 0.663,
  "project-hail-mary-ol21745884w": 0.65,
  "klara-and-the-sun-ol20883297w": 0.65,
  "normal-people-ol20150260w": 0.662,
  "crying-in-h-mart-ol22448002w": 0.676,
  "the-song-of-achilles-ol16509148w": 0.675,
  "the-bell-jar-ol1865528w": 0.624,
  "the-remains-of-the-day-ol59048w": 0.623,
};

/** The hero, left to right. */
export const HERO_BOOKS = ["dune-ol893414w", "the-secret-history-ol4321141w", "circe-ol18012166w", "project-hail-mary-ol21745884w"];
export const HERO_BOOKS_MOBILE = ["dune-ol893414w", "circe-ol18012166w", "project-hail-mary-ol21745884w"];

/** Whose real opening text is set on the paper scrap in the hero. */
export const HERO_FRAGMENT = "dune-ol893414w";

/**
 * The illustrated library: an example, captioned as one. One book in each reading
 * state, plus a second Want to Read, so every state the product has is shown.
 */
export const EXAMPLE_LIBRARY = [
  { slug: "dune-ol893414w", status: "CURRENTLY_READING" },
  { slug: "the-secret-history-ol4321141w", status: "WANT_TO_READ" },
  { slug: "klara-and-the-sun-ol20883297w", status: "WANT_TO_READ" },
  { slug: "the-song-of-achilles-ol16509148w", status: "READ" },
  { slug: "the-bell-jar-ol1865528w", status: "DNF" },
] as const;

/** Lying beside the phone in the last chapter. */
export const ANYWHERE_BOOK = "the-remains-of-the-day-ol59048w";

/** The how-it-works library strip: books already saved before Dune arrives. */
export const HOW_SHELF = ["the-secret-history-ol4321141w", "klara-and-the-sun-ol20883297w", "the-song-of-achilles-ol16509148w"];

/**
 * A misspelled query that the real search corrects to several real books: its answer is
 * four clean English editions. ("madeline miler" is corrected too, but its answer
 * includes a Spanish edition; see the backlog.)
 */
export const TYPO_EXAMPLE = "toni morison";

/** The misspelled author the how-it-works phone searches for; the real API answers it. */
export const HOW_IT_WORKS_QUERY = "frank herbrt";

export const LANDING_SLUGS = [...new Set([
  ...HERO_BOOKS, ...EXAMPLE_LIBRARY.map((e) => e.slug), ANYWHERE_BOOK, ...HOW_SHELF,
])];
