import { expect, test, type Page } from "@playwright/test";

/**
 * What a reader sees while signing in takes time. The API's free host can be slow or
 * asleep, so a submission must always be visibly in progress, must never be sent twice,
 * and must survive a gateway timeout. Delays and failures are injected at the network
 * layer; the API itself is real.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function openLogin(page: Page) {
  await page.goto("/login");
  // The page fetches its token on arrival; let that settle so the tests start from "warm".
  await page.waitForLoadState("networkidle");
}

test.describe("sign-in feedback", () => {
  test("acknowledges the click at once and never sends a second request", async ({ page }) => {
    let posts = 0;
    await page.route("**/api/v1/auth/session", async (route) => {
      posts++;
      await sleep(2500);
      await route.continue();
    });
    await openLogin(page);
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("a-long-enough-password");

    const button = page.getByRole("button", { name: "Sign in" });
    await button.click();
    // Same frame, near enough: locked and relabelled before anything comes back.
    await expect(page.locator("form")).toHaveAttribute("aria-busy", "true", { timeout: 200 });
    await expect(page.locator(".auth-action[data-state='pending'] button")).toHaveText(/Signing in…/, { timeout: 200 });
    await expect(page.locator(".auth-action[data-state='pending'] button")).toBeDisabled();

    // Enter in a field and more clicks while it is pending: still one request.
    await page.getByLabel("Password").press("Enter");
    await page.locator(".auth-action[data-state='pending'] button").click({ force: true });
    await expect(page.getByRole("status")).toContainText("Still signing in…", { timeout: 2000 });
    await expect(page.locator("form").getByRole("alert")).toBeVisible({ timeout: 5000 });
    expect(posts).toBe(1);
    // A failed attempt keeps what was typed.
    await expect(page.getByLabel("Email")).toHaveValue("nobody@example.com");
  });

  test("says the server is waking, and signs in once it answers", async ({ page }) => {
    const until = Date.now() + 6000;
    await page.route("**/api/v1/csrf", async (route) => {
      if (Date.now() < until) {
        await sleep(Math.max(0, until - Date.now()));
        return route.abort();
      }
      return route.continue();
    });
    await page.goto("/login");
    await page.getByRole("button", { name: "Explore demo account" }).click();
    await expect(page.getByRole("status")).toContainText("The demo server is waking up", { timeout: 4000 });
    await expect(page).toHaveURL("/home", { timeout: 20_000 });
  });

  test("retries a sign-in once after a gateway timeout", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/v1/auth/demo-session", async (route) => {
      calls++;
      if (calls === 1) return route.fulfill({ status: 504, contentType: "text/html", body: "<html>Gateway Timeout</html>" });
      return route.continue();
    });
    await openLogin(page);
    await page.getByRole("button", { name: "Explore demo account" }).click();
    await expect(page).toHaveURL("/home", { timeout: 15_000 });
    expect(calls).toBe(2);
  });

  test("sign-up errors sit beside their fields and focus the first one", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Enter your email.")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeFocused();
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  });

  test("the disclaimer is beside the form, before any credential", async ({ page }) => {
    for (const path of ["/login", "/signup"]) {
      await page.goto(path);
      const note = page.getByRole("note");
      await expect(note).toContainText("Not affiliated with Goodreads or Amazon");
      await expect(note).toContainText("not your Goodreads password");
      const noteBox = await note.boundingBox();
      const emailBox = await page.getByLabel("Email").boundingBox();
      expect(noteBox!.y).toBeLessThan(emailBox!.y);
    }
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the form is shown, and a password can never end up in a URL", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.locator("form")).toHaveAttribute("method", "post");
  });
});
