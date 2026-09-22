import { describe, expect, it } from "vitest";
import { cropRect } from "./photo-crop";

describe("cropRect", () => {
  const native = { width: 6000, height: 4000 };

  it("keeps the full height of a wide photo and centres the focal point", () => {
    expect(cropRect(native, 1, { x: 0.5, y: 0.5 })).toEqual({ left: 1000, top: 0, width: 4000, height: 4000 });
  });

  it("never runs off the edge, however far out the focal point is", () => {
    expect(cropRect(native, 1, { x: 0.95, y: 0.5 }).left).toBe(2000);
    expect(cropRect(native, 1, { x: 0, y: 0.5 }).left).toBe(0);
  });

  it("keeps the full width for a taller shape and slides vertically", () => {
    expect(cropRect(native, 2, { x: 0.5, y: 0.8 })).toEqual({ left: 0, top: 1000, width: 6000, height: 3000 });
  });

  it("returns the whole photo when the ratio matches", () => {
    expect(cropRect(native, 1.5, { x: 0.3, y: 0.3 })).toEqual({ left: 0, top: 0, width: 6000, height: 4000 });
  });
});
