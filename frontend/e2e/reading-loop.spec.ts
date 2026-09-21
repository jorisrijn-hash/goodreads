import { expect, test, type Page } from "@playwright/test";

/**
 * The Checkpoint D product loop, end to end against the real catalogue:
 *
 *   demo login -> discover -> search -> book detail -> save -> my library
 *
 * Each test signs in fresh and cleans up after itself so runs do not depend on order.
 */

async function enterDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore demo", exact: true }).click();
  await expect(page).toHaveURL("/home");
}

/** Opens a known book and removes it from the library if a previous run left it. */
async function openSecretHistory(page: Page) {
  await page.goto("/discover?q=the+secret+history");
  await page.locator("a[href^='/book/']").first().click();
  await page.waitForURL(/\/book\//);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Secret History");

  if (await page.getByRole("button", { name: "Change" }).count()) {
    await page.getByRole("button", { name: "Change" }).click();
    await page.getByRole("menuitem", { name: "Remove from library" }).click();
    await expect(page.getByRole("button", { name: "Want to Read" })).toBeVisible();
  }
}

test.describe("discover", () => {
  test("browses real catalogue sections with real covers", async ({ page }) => {
    await page.goto("/discover");

    await expect(page.getByRole("heading", { name: "Discover" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recently published" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Short reads" })).toBeVisible();

    // Covers come from our own storage, never hotlinked.
    const cover = page.locator("img").first();
    await expect(cover).toBeVisible();
    await expect(cover).toHaveAttribute("src", /\/covers\/.+-\d+\.jpg$/);
  });

  test("genre links filter the catalogue", async ({ page }) => {
    await page.goto("/discover");
    await page.getByRole("link", { name: /^Fantasy/ }).first().click();
    await page.waitForURL(/genre=fantasy/);
    await expect(page.locator("a[href^='/book/']").first()).toBeVisible();
  });
});

test.describe("search", () => {
  test("finds an exact title", async ({ page }) => {
    await page.goto("/discover");
    await page.getByLabel("Search books, authors or ISBN").fill("the secret history");
    await page.getByRole("button", { name: "Search" }).click();
    await page.waitForURL(/q=/);
    // The results are server-rendered, so wait for the count line to land before
    // asserting on a specific book — otherwise this races the navigation under load.
    await expect(page.getByText(/\d+ books?$/).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "The Secret History" }).first()).toBeVisible();
  });

  test("recovers a typo and says that it did", async ({ page }) => {
    await page.goto("/discover?q=The+Secre+Histroy");

    await expect(page.getByRole("heading", { name: "The Secret History" }).first()).toBeVisible();
    // The reader must be told the query was corrected, not silently answered differently.
    await expect(page.getByText(/close match/i)).toBeVisible();
  });

  test("an unmatched search offers a way out rather than a dead end", async ({ page }) => {
    await page.goto("/discover?q=zzzqqqnotarealbook");
    await expect(page.getByRole("heading", { name: "Nothing matched" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse the catalogue" })).toBeVisible();
  });
});

test.describe("book detail", () => {
  test("shows real metadata from the catalogue", async ({ page }) => {
    await page.goto("/discover?q=the+secret+history");
    await page.locator("a[href^='/book/']").first().click();
    await page.waitForURL(/\/book\//);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Secret History");
    await expect(page.getByText("Donna Tartt").first()).toBeVisible();
    await expect(page.getByText(/608 pages/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "About this book" })).toBeVisible();

    // We hold no ratings, so none may appear.
    await expect(page.getByText(/out of 5|★|\d+ ratings|\d+ reviews/)).toHaveCount(0);
  });
});

test.describe("the reading loop", () => {
  test("saves a book, changes its state, and finds it in the library", async ({ page }) => {
    await enterDemo(page);
    await openSecretHistory(page);

    // Save — one tap, no form in the way.
    await page.getByRole("button", { name: "Want to Read" }).click();
    await expect(page.getByText(/In your library as/)).toContainText("Want to Read");

    // The reason is offered after the save, never before it.
    await expect(page.getByText("Why did you save this?")).toBeVisible();

    // Start reading.
    await page.getByRole("button", { name: "Start reading" }).click();
    await expect(page.getByText(/In your library as/)).toContainText("Currently Reading");

    // It appears in the library under the right state.
    await page.goto("/library?status=CURRENTLY_READING");
    await expect(page.getByRole("heading", { name: "The Secret History" })).toBeVisible();

    // And on Home, under Continue reading.
    await page.goto("/home");
    await expect(page.getByRole("heading", { name: "Continue reading" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "The Secret History" })).toBeVisible();

    // Persists across a refresh — it is in the database, not in component state.
    await page.reload();
    await expect(page.getByRole("heading", { name: "The Secret History" })).toBeVisible();
  });

  test("a note can be added after saving, and survives a reload", async ({ page }) => {
    await enterDemo(page);
    await openSecretHistory(page);
    await page.getByRole("button", { name: "Want to Read" }).click();
    await expect(page.getByText(/In your library as/)).toBeVisible();

    await page.getByLabel("Note").fill("Sam recommended it.");
    await page.getByRole("button", { name: /Save note/ }).click();
    await expect(page.getByRole("status")).toContainText("Saved");

    await page.reload();
    await expect(page.getByLabel("Note")).toHaveValue("Sam recommended it.");
  });

  test("a book can be removed from the library", async ({ page }) => {
    await enterDemo(page);
    await openSecretHistory(page);
    await page.getByRole("button", { name: "Want to Read" }).click();
    await expect(page.getByText(/In your library as/)).toBeVisible();

    await page.getByRole("button", { name: "Change" }).click();
    await page.getByRole("menuitem", { name: "Remove from library" }).click();
    await expect(page.getByRole("button", { name: "Want to Read" })).toBeVisible();

    await page.goto("/library");
    await expect(page.getByRole("heading", { name: "The Secret History" })).toHaveCount(0);
  });
});

test.describe("saving while signed out", () => {
  test("sends the reader through sign-in and completes the save", async ({ page }) => {
    // Signed out, on a real book page.
    await page.goto("/discover?q=dune");
    await page.locator("a[href^='/book/']").first().click();
    await page.waitForURL(/\/book\//);
    const bookUrl = new URL(page.url()).pathname;

    await page.getByRole("button", { name: "Want to Read" }).click();

    // Intent is preserved in the URL rather than lost.
    await page.waitForURL(/\/login\?returnTo=/);
    expect(decodeURIComponent(page.url())).toContain(`${bookUrl}?save=1`);

    await page.getByRole("button", { name: "Explore demo account" }).click();

    // Back on the same book, and the save the reader asked for has happened.
    await page.waitForURL(new RegExp(bookUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await expect(page.getByText(/In your library as/)).toContainText("Want to Read");

    // Clean up so the next run starts fresh.
    await page.getByRole("button", { name: "Change" }).click();
    await page.getByRole("menuitem", { name: "Remove from library" }).click();
  });
});

test.describe("library", () => {
  test("empty states explain what to do next", async ({ page }) => {
    await enterDemo(page);
    await page.goto("/library?status=DNF");
    // The demo account has nothing abandoned, so this is the real empty state.
    await expect(page.getByRole("link", { name: "Discover books" })).toBeVisible();
  });

  test("navigation only offers destinations that exist", async ({ page }) => {
    await enterDemo(page);
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Discover" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "My Library" })).toBeVisible();
    // Journal is not built, so it must not appear.
    await expect(nav.getByRole("link", { name: "Journal" })).toHaveCount(0);
  });
});
