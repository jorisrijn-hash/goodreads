import { expect, test, type Page } from "@playwright/test";

/**
 * The authentication loop, end to end, against the real backend.
 *
 * Every account is created with a unique email so runs do not collide, and nothing here
 * depends on database state beyond the seeded demo account.
 */

const PASSWORD = "a-long-enough-password";

/**
 * Next.js injects its own role="alert" route announcer into every page, so an
 * unscoped alert query matches two elements. Scope to the form's error summary.
 */
function formAlert(page: Page) {
  return page.locator("form").getByRole("alert");
}

function uniqueAccount() {
  const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return { email: `e2e-${id}@example.com`, username: `e2e_${id}`.slice(0, 30) };
}

async function signUp(page: Page, account: { email: string; username: string }) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Username").fill(account.username);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/home");
}

test.describe("new account", () => {
  test("signs up, stays signed in across a refresh, then logs out", async ({ page }) => {
    const account = uniqueAccount();
    await signUp(page, account);

    await expect(page.getByRole("heading", { level: 1 })).toContainText(account.username);

    // A refresh must not sign the reader out — the session is server-side.
    await page.reload();
    await expect(page).toHaveURL("/home");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(account.username);

    await page.getByRole("button", { name: /account menu/i }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page).toHaveURL("/");

    // The protected page must no longer be reachable.
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("login", () => {
  test("signs in an existing account", async ({ page }) => {
    const account = uniqueAccount();
    await signUp(page, account);
    await page.getByRole("button", { name: /account menu/i }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/login");
    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/home");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(account.username);
  });

  test("a wrong password shows a generic error and creates no session", async ({ page }) => {
    const account = uniqueAccount();
    await signUp(page, account);
    await page.getByRole("button", { name: /account menu/i }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();

    await page.goto("/login");
    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Password").fill("definitely-not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(formAlert(page)).toContainText("Email or password is incorrect.");
    await expect(page).toHaveURL(/\/login/);

    // No session was established.
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login/);
  });

  test("an unknown account fails identically, revealing nothing", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("definitely-not-registered@example.com");
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(formAlert(page)).toContainText("Email or password is incorrect.");
  });
});

test.describe("demo account", () => {
  test("enters in one click from the landing page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Explore demo account" }).click();

    await expect(page).toHaveURL("/home");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Demo Reader");
    // The account is clearly identified as the demo, not passed off as a real reader.
    await expect(page.getByText(/signed in to the demo account/i)).toBeVisible();
  });

  test("is also reachable from the sign-in page", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Explore demo account" }).click();
    await expect(page).toHaveURL("/home");
  });
});

test.describe("return target", () => {
  test("returns to the page the reader was trying to reach", async ({ page }) => {
    const account = uniqueAccount();
    await signUp(page, account);
    await page.getByRole("button", { name: /account menu/i }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();

    // An internal target is honoured.
    await page.goto("/login?returnTo=%2Fhome");
    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/home");
  });

  test("an external target is ignored rather than followed", async ({ page }) => {
    const account = uniqueAccount();
    await signUp(page, account);
    await page.getByRole("button", { name: /account menu/i }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();

    for (const hostile of [
      "https%3A%2F%2Fevil.example",
      "%2F%2Fevil.example",
      "%2F%5Cevil.example",
    ]) {
      await page.goto(`/login?returnTo=${hostile}`);
      await page.getByLabel("Email").fill(account.email);
      await page.getByLabel("Password").fill(PASSWORD);
      await page.getByRole("button", { name: "Sign in" }).click();

      // Lands on the safe fallback, still on our own origin.
      await expect(page).toHaveURL("/home");
      expect(new URL(page.url()).host).toBe(new URL(page.url()).host);
      expect(page.url()).not.toContain("evil.example");

      await page.getByRole("button", { name: /account menu/i }).click();
      await page.getByRole("menuitem", { name: "Log out" }).click();
    }
  });

  test("visiting a protected page unauthenticated preserves the intent", async ({ page }) => {
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fhome/);
  });
});

test.describe("accessibility", () => {
  test("the sign-in form is completable with the keyboard alone", async ({ page }) => {
    const account = uniqueAccount();
    await signUp(page, account);
    await page.getByRole("button", { name: /account menu/i }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();

    await page.goto("/login");
    // Email is focused on load; tab through to the submit button.
    await page.keyboard.type(account.email);
    await page.keyboard.press("Tab");
    await page.keyboard.type(PASSWORD);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL("/home");
  });

  test("inputs have real labels and autocomplete for password managers", async ({ page }) => {
    await page.goto("/signup");

    for (const [label, autocomplete] of [
      ["Email", "email"],
      ["Username", "username"],
      ["Password", "new-password"],
    ] as const) {
      const input = page.getByLabel(label);
      await expect(input).toBeVisible();
      await expect(input).toHaveAttribute("autocomplete", autocomplete);
    }
  });

  test("validation errors are announced and tied to their field", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Username").fill("x");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(formAlert(page)).toBeVisible();
    await expect(page.getByLabel("Password")).toHaveAttribute("aria-invalid", "true");
  });
});
