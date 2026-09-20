import { describe, expect, it } from "vitest";
import { loginHref, safeReturnTo } from "./return-to";

describe("safeReturnTo", () => {
  it("allows internal application paths", () => {
    expect(safeReturnTo("/home")).toBe("/home");
    expect(safeReturnTo("/book/the-secret-history")).toBe("/book/the-secret-history");
    expect(safeReturnTo("/library?status=reading")).toBe("/library?status=reading");
    expect(safeReturnTo("/journal#2026")).toBe("/journal#2026");
  });

  it.each([
    ["https://evil.example", "absolute URL to another origin"],
    ["http://evil.example/path", "absolute URL, plain http"],
    ["//evil.example", "protocol-relative — absolute to a browser"],
    ["///evil.example", "three slashes, still absolute"],
    ["\\\\evil.example", "backslashes, normalised to // by some browsers"],
    ["/\\evil.example", "mixed slash and backslash"],
    ["javascript:alert(1)", "executes rather than navigates"],
    ["data:text/html,<script>alert(1)</script>", "data URL"],
    ["  https://evil.example  ", "padded with whitespace"],
    ["%2f%2fevil.example", "percent-encoded //"],
    ["https%3A%2F%2Fevil.example", "fully percent-encoded absolute URL"],
    ["/home\u0000javascript:alert(1)", "embedded null byte"],
    ["/home\njavascript:alert(1)", "embedded newline"],
  ])("refuses %s (%s)", (input) => {
    expect(safeReturnTo(input)).toBe("/home");
  });

  it("refuses malformed percent-encoding rather than guessing", () => {
    expect(safeReturnTo("%E0%A4%A")).toBe("/home");
  });

  it("falls back for empty and missing values", () => {
    expect(safeReturnTo(null)).toBe("/home");
    expect(safeReturnTo(undefined)).toBe("/home");
    expect(safeReturnTo("")).toBe("/home");
    expect(safeReturnTo("   ")).toBe("/home");
  });

  it("refuses to return to an auth screen, which would loop", () => {
    expect(safeReturnTo("/login")).toBe("/home");
    expect(safeReturnTo("/login?returnTo=/home")).toBe("/home");
    expect(safeReturnTo("/signup")).toBe("/home");
  });

  it("honours a custom fallback", () => {
    expect(safeReturnTo("https://evil.example", "/")).toBe("/");
  });
});

describe("loginHref", () => {
  it("carries a safe target", () => {
    expect(loginHref("/book/dune")).toBe("/login?returnTo=%2Fbook%2Fdune");
  });

  it("drops an unsafe one entirely rather than passing it along", () => {
    expect(loginHref("https://evil.example")).toBe("/login");
  });
});
