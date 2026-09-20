import { defineConfig, devices } from "@playwright/test";

/**
 * The backend must already be running, with a migrated database:
 *   cd backend && ./mvnw spring-boot:run
 *
 * Playwright starts the frontend itself.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // the tests share one database
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "list" : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
