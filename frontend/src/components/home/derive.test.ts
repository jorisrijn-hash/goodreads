import { describe, expect, it } from "vitest";
import type { LibraryEntry, ReadingStatus } from "@/lib/api";
import { deriveHome } from "./derive";

function entry(slug: string, status: ReadingStatus, savedDay: number, updatedDay = savedDay): LibraryEntry {
  return {
    book: { slug, title: slug, authors: [], publishedYear: null, pageCount: null, genres: [], coverKey: null },
    status, saveReason: null, saveNote: null,
    currentPage: null, progressPercent: null, progressUpdatedAt: null,
    startedAt: null, finishedAt: null,
    savedAt: `2026-09-${String(savedDay).padStart(2, "0")}T10:00:00Z`,
    updatedAt: `2026-09-${String(updatedDay).padStart(2, "0")}T10:00:00Z`,
  };
}

describe("deriveHome", () => {
  it("features the most recently updated book in progress", () => {
    const { featured, alsoReading } = deriveHome([
      entry("a", "CURRENTLY_READING", 1, 5),
      entry("b", "CURRENTLY_READING", 2, 9),
      entry("c", "READ", 3),
    ]);
    expect(featured?.book.slug).toBe("b");
    expect(alsoReading.map((e) => e.book.slug)).toEqual(["a"]);
  });

  it("lists recently saved by savedAt, without the featured book", () => {
    const { recentlySaved } = deriveHome([
      entry("old", "WANT_TO_READ", 1),
      entry("reading", "CURRENTLY_READING", 9, 12),
      entry("new", "READ", 8),
      entry("other-reading", "CURRENTLY_READING", 7, 2),
    ]);
    // Another book in progress may appear; only the featured one is left out.
    expect(recentlySaved.map((e) => e.book.slug)).toEqual(["new", "other-reading", "old"]);
  });

  it("with nothing in progress, offers up to three Want to Read books and does not repeat them", () => {
    const { featured, picks, recentlySaved } = deriveHome([
      entry("w1", "WANT_TO_READ", 1), entry("w2", "WANT_TO_READ", 2), entry("w3", "WANT_TO_READ", 3),
      entry("w4", "WANT_TO_READ", 4), entry("r", "READ", 5),
    ]);
    expect(featured).toBeNull();
    expect(picks.map((e) => e.book.slug)).toEqual(["w4", "w3", "w2"]);
    expect(recentlySaved.map((e) => e.book.slug)).toEqual(["r", "w1"]);
  });

  it("caps recently saved at six and handles an empty library", () => {
    const many = Array.from({ length: 9 }, (_, i) => entry(`b${i}`, "READ", i + 1));
    expect(deriveHome(many).recentlySaved).toHaveLength(6);
    expect(deriveHome([])).toEqual({ featured: null, alsoReading: [], picks: [], recentlySaved: [] });
  });
});
