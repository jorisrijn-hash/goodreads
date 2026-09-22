import { describe, expect, it } from "vitest";
import { isTransient, pendingCopy } from "./auth-flow";

describe("pendingCopy", () => {
  it("acknowledges immediately, then says more as time passes", () => {
    expect(pendingCopy("login", 0, false)).toEqual({ button: "Signing in…", detail: null });
    expect(pendingCopy("login", 1200, false)).toEqual({ button: "Still signing in…", detail: "Checking your account." });
    expect(pendingCopy("login", 5000, false)).toEqual({ button: "Opening your library…", detail: "This is taking longer than usual." });
    expect(pendingCopy("login", 45_000, false).detail).toMatch(/Keep this page open/);
  });

  it("says the server is waking only while it has not answered", () => {
    expect(pendingCopy("login", 1200, true).detail).toBe("The demo server is waking up. This can take a moment.");
    expect(pendingCopy("demo", 1200, true).button).toBe("Preparing the demo…");
    expect(pendingCopy("signup", 40_000, true)).toEqual({
      button: "Still waking the library…",
      detail: "Your account is still being created. Keep this page open.",
    });
  });

  it("never claims a percentage or names the host", () => {
    for (const kind of ["login", "signup", "demo"] as const) {
      for (const t of [0, 1000, 5000, 40_000]) {
        for (const waking of [true, false]) {
          const { button, detail } = pendingCopy(kind, t, waking);
          expect(`${button} ${detail}`).not.toMatch(/%|render/i);
        }
      }
    }
  });
});

describe("isTransient", () => {
  it("retries gateway and network failures, never an answer", () => {
    expect(isTransient(new TypeError("Failed to fetch"))).toBe(true);
    expect(isTransient(new SyntaxError("Unexpected token <"))).toBe(true);
    expect(isTransient({ status: 504 })).toBe(true);
    expect(isTransient({ status: 401 })).toBe(false);
    expect(isTransient({ status: 400 })).toBe(false);
    expect(isTransient({ status: 409 })).toBe(false);
  });
});
