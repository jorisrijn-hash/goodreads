import type { LibraryEntry } from "@/lib/api";

const byDesc = (key: "updatedAt" | "savedAt") => (a: LibraryEntry, b: LibraryEntry) =>
  Date.parse(b[key]) - Date.parse(a[key]);

/**
 * Everything Home shows about the reader's books, from the one library list.
 *
 * - featured: the most recently updated Currently Reading book
 * - alsoReading: the other Currently Reading books, most recently updated first
 * - picks: with nothing in progress, up to three Want to Read books (newest saved first)
 * - recentlySaved: up to six, newest saved first, without the featured book and without
 *   the picks already shown beside the empty feature
 *
 * Counts are not derived here: they come from the summary, as on the library's tabs.
 */
export function deriveHome(entries: LibraryEntry[]) {
  const reading = entries.filter((e) => e.status === "CURRENTLY_READING").sort(byDesc("updatedAt"));
  const featured = reading[0] ?? null;
  const alsoReading = reading.slice(1);
  const bySaved = [...entries].sort(byDesc("savedAt"));
  const picks = featured ? [] : bySaved.filter((e) => e.status === "WANT_TO_READ").slice(0, 3);
  const shown = new Set([featured?.book.slug, ...picks.map((p) => p.book.slug)]);
  const recentlySaved = bySaved.filter((e) => !shown.has(e.book.slug)).slice(0, 6);
  return { featured, alsoReading, picks, recentlySaved };
}
