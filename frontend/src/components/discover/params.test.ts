import { describe, expect, it } from "vitest";
import { activeLength, apiQuery, clean, discoverHref, effectiveSort, lengthLabel, sortOptions } from "./params";

describe("discover params", () => {
  it("keeps only known, non-empty parameters", () => {
    expect(clean({ q: " dune ", genre: "", junk: "x", sort: ["OLDEST", "NEWEST"] })).toEqual({ q: "dune", sort: "OLDEST" });
  });

  it("defaults to newest without a query and relevance with one", () => {
    expect(effectiveSort({})).toBe("NEWEST");
    expect(effectiveSort({ q: "dune" })).toBe("RELEVANCE");
    expect(effectiveSort({ sort: "oldest" })).toBe("OLDEST");
    // Relevance means nothing without a query.
    expect(effectiveSort({ sort: "RELEVANCE" })).toBe("NEWEST");
    expect(effectiveSort({ sort: "POPULAR" })).toBe("NEWEST");
  });

  it("offers relevance only while searching", () => {
    expect(sortOptions({}).map((s) => s.id)).not.toContain("RELEVANCE");
    expect(sortOptions({ q: "x" })[0].id).toBe("RELEVANCE");
  });

  it("builds links that reset the page and drop the default sort", () => {
    expect(discoverHref({ genre: "fantasy", page: "3" }, { maxPages: "199" })).toBe("/discover?genre=fantasy&maxPages=199");
    expect(discoverHref({ sort: "OLDEST" }, { sort: "NEWEST" })).toBe("/discover");
    expect(discoverHref({ q: "dune" }, { sort: "NEWEST" })).toBe("/discover?q=dune&sort=NEWEST");
    expect(discoverHref({ q: "dune", genre: "fantasy" }, { genre: undefined })).toBe("/discover?q=dune");
    expect(discoverHref({ q: "a b" }, { page: "2" })).toBe("/discover?q=a+b&page=2");
  });

  it("sends the effective sort to the API", () => {
    // The bug this replaces: ?sort=NEWEST alone showed the browse view, not the order.
    expect(apiQuery({ sort: "NEWEST" }, 0)).toBe("/api/v1/books?sort=NEWEST&page=0&size=24");
    expect(apiQuery({ q: "dune", minPages: "600" }, 2)).toBe("/api/v1/books?q=dune&minPages=600&sort=RELEVANCE&page=2&size=24");
  });

  it("names length bands, and older ranges that match none", () => {
    expect(activeLength({})?.id).toBe("any");
    expect(activeLength({ minPages: "200", maxPages: "599" })?.id).toBe("medium");
    expect(lengthLabel({ maxPages: "199" })).toBe("Under 200 pages");
    expect(lengthLabel({ maxPages: "200" })).toBe("Up to 200 pages");
    expect(lengthLabel({})).toBeNull();
  });
});
