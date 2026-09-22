import type { LibraryEntry, ReadingStatus } from "@/lib/api";

/**
 * The Library's view state, all derived from the one list the page loaded: which shelf,
 * a search within it, and an order. Kept in the URL so every view can be linked and
 * survives a refresh; applied here so switching is instant instead of a server round trip.
 */
export type Shelf = ReadingStatus | "ALL";
export type LibrarySort = "updated" | "saved" | "title" | "author";

export const SHELVES: { key: Shelf; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "WANT_TO_READ", label: "Want to Read" },
  { key: "CURRENTLY_READING", label: "Currently Reading" },
  { key: "READ", label: "Read" },
  { key: "DNF", label: "Did Not Finish" },
];

/** Only orders the data supports. "updated" is the API's own order and the default. */
export const SORTS: { key: LibrarySort; label: string }[] = [
  { key: "updated", label: "Recently updated" },
  { key: "saved", label: "Date saved" },
  { key: "title", label: "Title" },
  { key: "author", label: "Author" },
];

export function parseShelf(value: string | null | undefined): Shelf {
  return SHELVES.some((s) => s.key === value) ? (value as Shelf) : "ALL";
}

export function parseSort(value: string | null | undefined): LibrarySort {
  return SORTS.some((s) => s.key === value) ? (value as LibrarySort) : "updated";
}

/**
 * The same match the API uses for ?q= (LibraryService.matches): case-insensitive
 * "contains" on the title or any author, so results do not change with JavaScript on or off.
 */
export function matches(entry: LibraryEntry, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return entry.book.title.toLowerCase().includes(needle) || entry.book.authors.some((a) => a.toLowerCase().includes(needle));
}

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

export function view(entries: LibraryEntry[], shelf: Shelf, query: string, sort: LibrarySort): LibraryEntry[] {
  const list = entries.filter((e) => (shelf === "ALL" || e.status === shelf) && matches(e, query));
  switch (sort) {
    case "saved":
      return list.sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
    case "title":
      return list.sort((a, b) => collator.compare(a.book.title, b.book.title));
    case "author":
      return list.sort((a, b) => collator.compare(a.book.authors[0] ?? "￿", b.book.authors[0] ?? "￿") || collator.compare(a.book.title, b.book.title));
    default:
      // The API already returns the library most recently updated first.
      return list;
  }
}

export function libraryHref(shelf: Shelf, query: string, sort: LibrarySort): string {
  const params = new URLSearchParams();
  if (shelf !== "ALL") params.set("status", shelf);
  if (query.trim()) params.set("q", query.trim());
  if (sort !== "updated") params.set("sort", sort);
  const qs = params.toString();
  return qs ? `/library?${qs}` : "/library";
}
