import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ toString: () => "" }) }));

import { fetchPublicResult } from "./server-api";

function respond(status: number, body: unknown = {}) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
}

afterEach(() => vi.unstubAllGlobals());

/**
 * The distinction these pin down is the one that matters on a free tier: an API that is
 * asleep must not be reported as a missing book or a signed-out reader.
 */
describe("fetchPublicResult", () => {
  it("returns data for a successful response", async () => {
    respond(200, { title: "Dune" });
    expect(await fetchPublicResult("/api/v1/books/dune")).toEqual({ kind: "ok", data: { title: "Dune" } });
  });

  it.each([400, 401, 404])("treats %i as an answer", async (status) => {
    respond(status);
    expect(await fetchPublicResult("/x")).toEqual({ kind: "absent", status });
  });

  it.each([500, 502, 503, 504])("treats %i as not knowing", async (status) => {
    respond(status);
    expect(await fetchPublicResult("/x")).toEqual({ kind: "unavailable" });
  });

  it("treats a network failure or timeout as not knowing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new DOMException("The operation timed out.", "TimeoutError");
    }));
    expect(await fetchPublicResult("/x")).toEqual({ kind: "unavailable" });
  });
});
