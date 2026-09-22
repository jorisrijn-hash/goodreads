import { describe, expect, it } from "vitest";
import { cleanDescription, paragraphs, splitLede } from "./description";

describe("cleanDescription", () => {
  it("removes citations and their definitions but keeps every sentence", () => {
    const raw = "The Road was the winner of the 2006 Pulitzer Prize for Literature. ([source][1]) [1]: https://www.cormacmccarthy.com/works/the-road/";
    expect(cleanDescription(raw)).toBe("The Road was the winner of the 2006 Pulitzer Prize for Literature.");
  });

  it("keeps link text, drops targets, and strips emphasis", () => {
    const raw = "***The Name of the Wind*** compares to [Tad Williams][1] and [Robert Jordan][3]. Followed by: [***The Wise Man's Fear***][4] ([Source: special note from the publisher][5]) [1]: https://openlibrary.org/authors/OL292141A/ [3]: https://x.org [4]: https://y.org [5]: https://z.org";
    expect(cleanDescription(raw)).toBe("The Name of the Wind compares to Tad Williams and Robert Jordan. Followed by: The Wise Man's Fear");
  });

  it("stops at a rule before lists of other editions", () => {
    const raw = "A fictional guide book for hitchhikers. --- Also contained in: - [The Trilogy](https://openlibrary.org/works/OL1W)";
    expect(cleanDescription(raw)).toBe("A fictional guide book for hitchhikers.");
  });

  it("leaves ordinary prose, hyphens and asterisks in words alone", () => {
    const raw = "A well-known, twenty-first-century story about 3*4 things.\n\nSecond paragraph.";
    expect(cleanDescription(raw)).toBe(raw);
  });

  it("drops footnote markers and unclosed emphasis, keeps cited page references", () => {
    expect(cleanDescription("**The eagerly awaited sequel. Western civilization,[16] is fresh.")).toBe("The eagerly awaited sequel. Western civilization, is fresh.");
    expect(cleanDescription("A great adventure.\"--P. [4] of cover.")).toBe("A great adventure.\"--P. [4] of cover.");
  });

  it("returns null for nothing", () => {
    expect(cleanDescription(null)).toBeNull();
    expect(cleanDescription("([source][1]) [1]: https://x.org")).toBeNull();
  });
});

describe("splitLede", () => {
  it("opens with whole sentences and continues without repeating", () => {
    const text = "Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides. He is heir to a noble family tasked with ruling an inhospitable world. When House Atreides is betrayed, everything changes. More follows.";
    const { lede, rest } = splitLede(text);
    expect(lede).toBe("Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides. He is heir to a noble family tasked with ruling an inhospitable world.");
    expect(`${lede} ${rest}`).toBe(text);
  });

  it("keeps a short description whole", () => {
    expect(splitLede("A short one.")).toEqual({ lede: "A short one.", rest: "" });
  });
});

describe("paragraphs", () => {
  it("breaks a long paragraph at sentences and loses nothing", () => {
    const sentence = "This sentence is exactly long enough to count for something here. ";
    const text = sentence.repeat(20).trim();
    const out = paragraphs(text);
    expect(out.length).toBeGreaterThan(1);
    expect(out.join(" ")).toBe(text);
    expect(out.every((p) => p.endsWith("."))).toBe(true);
  });

  it("leaves ordinary paragraphs as they are", () => {
    expect(paragraphs("One.\n\nTwo.")).toEqual(["One.", "Two."]);
  });
});
