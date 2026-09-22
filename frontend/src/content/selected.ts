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
  "never-let-me-go-ol59038w": 0.634,
  "nineteen-eighty-four-ol1168083w": 0.626,
  "tomorrow-and-tomorrow-and-tomorrow-ol26004554w": 0.6625,
  "educated-ol18139176w": 0.658,
  "middlemarch-ol20867w": 0.584,
  "jane-eyre-ol1095427w": 0.613,
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

/**
 * The hero, left to right. Chosen for sharp full-resolution printed covers
 * (content/landing-covers.ts) as much as for the books: Circe and Project Hail Mary
 * left this set because no scan of either is larger than 330px.
 */
export const HERO_BOOKS = ["dune-ol893414w", "the-secret-history-ol4321141w", "never-let-me-go-ol59038w", "nineteen-eighty-four-ol1168083w"];
export const HERO_BOOKS_MOBILE = ["dune-ol893414w", "never-let-me-go-ol59038w", "nineteen-eighty-four-ol1168083w"];

/** Whose real opening text is set on the paper scrap in the hero. */
export const HERO_FRAGMENT = "dune-ol893414w";

/**
 * The illustrated library: an example, captioned as one. One book in each reading
 * state, plus a second Want to Read, so every state the product has is shown.
 */
export const EXAMPLE_LIBRARY = [
  { slug: "tomorrow-and-tomorrow-and-tomorrow-ol26004554w", status: "CURRENTLY_READING" },
  { slug: "normal-people-ol20150260w", status: "WANT_TO_READ" },
  { slug: "jane-eyre-ol1095427w", status: "WANT_TO_READ" },
  { slug: "educated-ol18139176w", status: "READ" },
  { slug: "middlemarch-ol20867w", status: "DNF" },
] as const;

/** Lying beside the phone in the last chapter. */
export const ANYWHERE_BOOK = "the-secret-history-ol4321141w";

/** The how-it-works library strip: books already saved before Dune arrives. */
export const HOW_SHELF = ["normal-people-ol20150260w", "educated-ol18139176w", "never-let-me-go-ol59038w"];

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
