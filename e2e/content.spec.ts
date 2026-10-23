import en from "../src/locales/en.json" with { type: "json" };
import { expect, test } from "./fixtures";

// The content script matches https://example.com/*. The page is served from a
// route rather than the network, so the suite runs offline and the host page is
// the same every time.
test("the content script marks a matching page and leaves others alone", async ({
  context,
}) => {
  await context.route("https://example.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Host</title><p>Host page</p>",
    }),
  );
  await context.route("https://example.org/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Other</title><p>Other page</p>",
    }),
  );

  const page = await context.newPage();
  await page.goto("https://example.com/");
  // Playwright's Chromium runs with an English UI, so the default catalog is
  // what the content script renders.
  await expect(page.locator("[data-extension-template-marker]")).toHaveText(
    en.content.marker,
  );

  await page.goto("https://example.org/");
  await expect(page.getByText("Other page")).toBeVisible();
  await expect(page.locator("[data-extension-template-marker]")).toHaveCount(0);
});
