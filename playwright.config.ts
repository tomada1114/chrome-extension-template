import { defineConfig } from "@playwright/test";

// The end-to-end suite loads the production build from `.output/chrome-mv3/`
// into Playwright's bundled Chromium, so it runs after `pnpm build` and never
// builds anything itself — the same split `test:manifest` keeps. Branded
// Google Chrome ignores `--load-extension`, which is why the fixture in
// `e2e/fixtures.ts` launches the `chromium` channel rather than `chrome`.
export default defineConfig({
  testDir: "e2e",
  // One persistent browser context per test, each with its own profile: a
  // service worker or storage write from one test can never leak into another.
  fullyParallel: true,
  forbidOnly: true,
  retries: process.env["CI"] === undefined ? 0 : 1,
  reporter:
    process.env["CI"] === undefined ? "list" : [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  use: {
    trace: "retain-on-failure",
  },
});
