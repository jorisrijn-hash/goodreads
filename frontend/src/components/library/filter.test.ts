import { describe, expect, it } from "vitest";
import type { LibraryEntry, ReadingStatus } from "@/lib/api";
import { libraryHref, matches, parseShelf, parseSort, view } from "./filter";

function entry(slug: string, title: string, author: string, status: ReadingStatus, saved: number, updated: number): LibraryEntry {
  return {
    book: { slug, title, authors: [author], publishedYear: null, pageCount: null, genres: [], coverKey: null },
    status, saveReason: null, saveNote: null,
    currentPage: null, progressPercent: null, progressUpdatedAt: null,
    startedAt: null, finishedAt: null,
    savedAt: `2026-09-${String(saved).padStart(2, "0")}T10:00:00Z`,
    updatedAt: `2026-09-${String(updated).padStart(2, "0")}T10:00:00Z`,
  };
}

// In the API's order: most recently updated first.
const LIB = [
  entry("dune", "Dune", "Frank Herbert", "CURRENTLY_READING", 1, 20),
  entry("circe", "Circe", "Madeline Miller", "WANT_TO_READ", 15, 15),
  entry("beloved", "Beloved", "Toni Morrison", "READ", 3, 10),
  entry("atlas", "Atlas Shrugged", "Ayn Rand", "DNF", 9, 9),
];

describe("library view", () => {
  it("filters by shelf and keeps the API's order by default", () => {
    expect(view(LIB, "ALL", "", "updated").map((e) => e.book.slug)).toEqual(["dune", "circe", "beloved", "atlas"]);
    expect(view(LIB, "READ", "", "updated").map((e) => e.book.slug)).toEqual(["beloved"]);
  });

  it("searches title and author the way the API does", () => {
    expect(matches(LIB[0], "HERB")).toBe(true);
    expect(matches(LIB[0], "dun")).toBe(true);
    expect(matches(LIB[0], "miller")).toBe(false);
    expect(view(LIB, "ALL", "mor", "updated").map((e) => e.book.slug)).toEqual(["beloved"]);
  });

  it("sorts by date saved, title and author", () => {
    expect(view(LIB, "ALL", "", "saved").map((e) => e.book.slug)).toEqual(["circe", "atlas", "beloved", "dune"]);
    expect(view(LIB, "ALL", "", "title").map((e) => e.book.slug)).toEqual(["atlas", "beloved", "circe", "dune"]);
    expect(view(LIB, "ALL", "", "author").map((e) => e.book.slug)).toEqual(["atlas", "dune", "circe", "beloved"]);
  });

  it("never reorders the list it was given", () => {
    const copy = [...LIB];
    view(LIB, "ALL", "", "title");
    expect(LIB).toEqual(copy);
  });

  it("reads and writes the URL state, defaulting safely", () => {
    expect(parseShelf("READ")).toBe("READ");
    expect(parseShelf("nonsense")).toBe("ALL");
    expect(parseSort(undefined)).toBe("updated");
    expect(libraryHref("ALL", "", "updated")).toBe("/library");
    expect(libraryHref("DNF", " dune ", "title")).toBe("/library?status=DNF&q=dune&sort=title");
  });
});
